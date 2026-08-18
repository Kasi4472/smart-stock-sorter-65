import type { Decision, WarehouseState } from "./types";

export type Suggestion = {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "SLA" | "Stock" | "Floor" | "Quality" | "Flow";
  title: string;
  detail: string;
  /** Optional route to jump to for acting on the suggestion. */
  to?: string;
};

const available = (p: { onHand: number; reserved: number; damaged: number }) =>
  p.onHand - p.reserved - p.damaged;

/**
 * Derives AI-style operational notifications from the live warehouse state.
 * Purely presentational insight — no state is mutated here.
 */
export function buildSuggestions(state: WarehouseState, decisions: Decision[]): Suggestion[] {
  const out: Suggestion[] = [];

  // 1. SLA risk
  const slaRisk = state.orders.filter(
    (o) => o.dueInHours <= 6 && !["dispatched"].includes(o.status),
  );
  if (slaRisk.length) {
    const worst = [...slaRisk].sort((a, b) => a.dueInHours - b.dueInHours)[0]!;
    out.push({
      id: "sug-sla",
      severity: slaRisk.length > 2 ? "critical" : "warning",
      category: "SLA",
      title: `${slaRisk.length} order(s) at SLA risk`,
      detail: `${worst.id} (${worst.tier.toUpperCase()}) is due in ${worst.dueInHours}h and still ${worst.status.replace("_", " ")}. Prioritise it on the floor next.`,
      to: "/orders",
    });
  }

  // 2. Backorders
  const backorders = state.orders.filter((o) => o.status === "backorder");
  if (backorders.length) {
    out.push({
      id: "sug-backorder",
      severity: "warning",
      category: "Flow",
      title: `${backorders.length} order(s) waiting on stock`,
      detail: `Run the allocation engine after the next inbound, or release partial shipments to protect promised dates.`,
      to: "/orders",
    });
  }

  // 3. Stock cover
  state.products
    .filter((p) => available(p) <= p.reorderPoint)
    .slice(0, 3)
    .forEach((p) => {
      const cover = p.dailyDemand > 0 ? Math.floor(available(p) / p.dailyDemand) : 99;
      out.push({
        id: `sug-stock-${p.sku}`,
        severity: cover <= p.leadTimeDays ? "critical" : "warning",
        category: "Stock",
        title: `${p.sku} below reorder point`,
        detail: `${available(p)} available · ~${cover}d cover vs ${p.leadTimeDays}d lead time. Suggested PO: ${p.reorderQty} units.`,
        to: "/inventory",
      });
    });

  // 4. Open exceptions
  const openExc = state.exceptions.filter((e) => e.status === "open");
  if (openExc.length) {
    out.push({
      id: "sug-exceptions",
      severity: openExc.length > 2 ? "critical" : "warning",
      category: "Quality",
      title: `${openExc.length} unresolved exception(s)`,
      detail: `Oldest: ${openExc[openExc.length - 1]!.id} · ${openExc[openExc.length - 1]!.type.replace("_", " ")} on ${openExc[openExc.length - 1]!.sku}. Resolve to release blocked stock.`,
      to: "/exceptions",
    });
  }

  // 5. Bottleneck detection
  const stages = ["picking", "packing", "qc"] as const;
  const counts = stages.map((s) => ({ s, n: state.orders.filter((o) => o.status === s).length }));
  const worstStage = [...counts].sort((a, b) => b.n - a.n)[0]!;
  if (worstStage.n >= 3) {
    out.push({
      id: "sug-bottleneck",
      severity: "info",
      category: "Floor",
      title: `${worstStage.s} is the current bottleneck`,
      detail: `${worstStage.n} orders queued at ${worstStage.s}. Consider moving one operator across from a lighter stage.`,
      to: "/fulfillment",
    });
  }

  // 6. Engine decisions surfaced as notifications
  decisions.slice(0, 4).forEach((d) => {
    out.push({
      id: `sug-${d.id}`,
      severity: d.severity,
      category: "Flow",
      title: d.title,
      detail: `${d.rationale} Recommended action: ${d.action}.`,
      to: "/",
    });
  });

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
