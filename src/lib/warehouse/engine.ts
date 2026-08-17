import type { Decision, Order, Product, WarehouseState } from "./types";

const tierWeight: Record<Order["tier"], number> = { vip: 40, express: 26, standard: 10 };

export const available = (p: Product) => Math.max(0, p.onHand - p.reserved - p.damaged);

export const orderValue = (order: Order, products: Product[]) =>
  order.lines.reduce((sum, l) => sum + l.qty * (products.find((p) => p.sku === l.sku)?.unitCost ?? 0), 0);

/** Composite priority: SLA urgency dominates, then tier, value and age. */
export function priorityScore(order: Order, products: Product[]) {
  const urgency = Math.max(0, 48 - order.dueInHours) * 1.6;
  const value = Math.min(30, orderValue(order, products) / 60);
  const ageHours = (Date.now() - new Date(order.createdAt).getTime()) / 3600_000;
  const age = Math.min(12, ageHours * 0.3);
  return Math.round(urgency + tierWeight[order.tier] + value + age);
}

export const priorityBand = (score: number) =>
  score >= 95 ? "critical" : score >= 70 ? "high" : score >= 45 ? "medium" : "low";

export const fillRate = (order: Order) => {
  const need = order.lines.reduce((s, l) => s + l.qty, 0);
  const got = order.lines.reduce((s, l) => s + l.allocated, 0);
  return need === 0 ? 1 : got / need;
};

export const daysOfCover = (p: Product) =>
  p.dailyDemand > 0 ? +(available(p) / p.dailyDemand).toFixed(1) : 99;

export const stockState = (p: Product) => {
  const a = available(p);
  if (a <= 0) return "out" as const;
  if (a <= p.reorderPoint * 0.5) return "critical" as const;
  if (a <= p.reorderPoint) return "low" as const;
  return "healthy" as const;
};

/**
 * Greedy priority-first allocation. Highest-scoring orders reserve stock first;
 * remaining orders receive partial allocation and are flagged as backorders.
 */
export function allocate(state: WarehouseState): {
  products: Product[];
  orders: Order[];
  notes: string[];
} {
  const products = state.products.map((p) => ({ ...p }));
  const pool = new Map(products.map((p) => [p.sku, available(p)]));
  const notes: string[] = [];

  const ranked = [...state.orders]
    .map((o) => ({ o, score: priorityScore(o, products) }))
    .sort((a, b) => b.score - a.score);

  const orders = state.orders.map((o) => o);
  for (const { o } of ranked) {
    if (!["new", "backorder", "allocated"].includes(o.status)) continue;
    const lines = o.lines.map((l) => {
      const free = pool.get(l.sku) ?? 0;
      const give = Math.min(l.qty - l.allocated, free);
      pool.set(l.sku, free - give);
      return { ...l, allocated: l.allocated + give };
    });
    const complete = lines.every((l) => l.allocated >= l.qty);
    const idx = orders.findIndex((x) => x.id === o.id);
    const status = complete ? "allocated" : "backorder";
    if (status !== o.status || JSON.stringify(lines) !== JSON.stringify(o.lines)) {
      notes.push(
        complete
          ? `${o.id} fully allocated`
          : `${o.id} partially allocated (${Math.round(fillRate({ ...o, lines }) * 100)}%)`,
      );
    }
    orders[idx] = {
      ...o,
      lines,
      status,
      events: [
        ...o.events,
        { at: new Date().toISOString(), label: complete ? "Stock allocated" : "Partially allocated", detail: lines.map((l) => `${l.sku} ${l.allocated}/${l.qty}`).join(", ") },
      ],
    };
  }

  for (const p of products) {
    const reservedTotal = orders
      .filter((o) => !["dispatched"].includes(o.status))
      .reduce((s, o) => s + (o.lines.find((l) => l.sku === p.sku)?.allocated ?? 0), 0);
    p.reserved = reservedTotal;
  }

  return { products, orders, notes };
}

/** The decision engine: surfaces conflicts and recommends a resolution. */
export function decisions(state: WarehouseState): Decision[] {
  const out: Decision[] = [];
  const { products, orders } = state;

  // 1. Reallocation conflicts: a starved high-priority order vs. a lower one holding stock.
  const short = orders
    .filter((o) => o.status === "backorder")
    .map((o) => ({ o, score: priorityScore(o, products) }))
    .sort((a, b) => b.score - a.score);

  for (const { o, score } of short) {
    for (const line of o.lines.filter((l) => l.allocated < l.qty)) {
      const gap = line.qty - line.allocated;
      const donor = orders
        .filter(
          (d) =>
            d.id !== o.id &&
            ["allocated", "new"].includes(d.status) &&
            priorityScore(d, products) < score - 15 &&
            (d.lines.find((l) => l.sku === line.sku)?.allocated ?? 0) > 0,
        )
        .sort((a, b) => priorityScore(a, products) - priorityScore(b, products))[0];
      if (!donor) continue;
      const donorLine = donor.lines.find((l) => l.sku === line.sku)!;
      const move = Math.min(gap, donorLine.allocated);
      out.push({
        id: `real-${o.id}-${line.sku}`,
        kind: "reallocate",
        severity: "critical",
        title: `Reallocate ${move} × ${line.sku} from ${donor.id} → ${o.id}`,
        rationale: `${o.id} (${o.tier.toUpperCase()}, due in ${o.dueInHours}h, score ${score}) is short ${gap} units. ${donor.id} scores ${priorityScore(donor, products)} and is due in ${donor.dueInHours}h — it can absorb the delay and be back-ordered against inbound stock.`,
        action: "Reallocate stock",
        payload: { from: donor.id, to: o.id, sku: line.sku, qty: move },
      });
    }
  }

  // 2. Reorder recommendations driven by cover vs. lead time.
  for (const p of products) {
    const cover = daysOfCover(p);
    if (cover <= p.leadTimeDays) {
      const qty = Math.max(p.reorderQty, Math.ceil(p.dailyDemand * (p.leadTimeDays + 7)) - available(p));
      out.push({
        id: `reorder-${p.sku}`,
        kind: "reorder",
        severity: available(p) === 0 ? "critical" : "warning",
        title: `Raise PO for ${qty} × ${p.sku}`,
        rationale: `${available(p)} units available = ${cover}d of cover against a ${p.leadTimeDays}d lead time at ${p.dailyDemand}/day. Stockout expected before replenishment lands.`,
        action: "Create purchase order",
        payload: { sku: p.sku, qty },
      });
    }
  }

  // 3. Split shipment when a mostly-fillable urgent order is blocked by one line.
  for (const o of orders.filter((x) => x.status === "backorder")) {
    const rate = fillRate(o);
    if (rate >= 0.6 && rate < 1 && o.dueInHours <= 12) {
      out.push({
        id: `split-${o.id}`,
        kind: "split",
        severity: "warning",
        title: `Split ${o.id} — ship ${Math.round(rate * 100)}% now`,
        rationale: `${o.id} is due in ${o.dueInHours}h and ${Math.round(rate * 100)}% fillable. Releasing the available lines protects the SLA; the remainder ships on replenishment.`,
        action: "Release partial shipment",
        payload: { orderId: o.id },
      });
    }
  }

  return out;
}

export function bottleneck(orders: Order[]) {
  const stages: Order["status"][] = ["new", "allocated", "backorder", "picking", "packing", "qc"];
  const counts = stages.map((s) => ({ stage: s, count: orders.filter((o) => o.status === s).length }));
  return counts.sort((a, b) => b.count - a.count)[0];
}
