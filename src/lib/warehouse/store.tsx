import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import * as mock from "./mock";
import { allocate, decisions as computeDecisions } from "./engine";
import type { Decision, Order, OrderStatus, WarehouseException, WarehouseState } from "./types";

const nextStage: Partial<Record<OrderStatus, OrderStatus>> = {
  allocated: "picking",
  picking: "packing",
  packing: "qc",
  qc: "dispatched",
};

type Ctx = {
  state: WarehouseState;
  decisions: Decision[];
  runAllocation: () => void;
  applyDecision: (d: Decision) => void;
  dismissDecision: (id: string) => void;
  advance: (orderId: string) => void;
  reportException: (input: { sku: string; qty: number; type: WarehouseException["type"]; orderId?: string }) => void;
  resolveException: (id: string, resolution: string) => void;
  receiveStock: (sku: string, qty: number) => void;
};

const WarehouseContext = createContext<Ctx | null>(null);

const stamp = () => new Date().toISOString();

export function WarehouseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WarehouseState>(() => {
    const base: WarehouseState = {
      products: mock.products,
      orders: mock.orders,
      exceptions: mock.exceptions,
      log: [{ at: stamp(), label: "Shift started", detail: "Day shift · 6 pickers online" }],
    };
    // Boot with an allocation pass so the floor opens in a realistic state.
    const { products, orders, notes } = allocate(base);
    return {
      ...base,
      products,
      orders,
      log: [{ at: stamp(), label: "Opening allocation run", detail: `${notes.length} order(s) planned` }, ...base.log],
    };
  });
  const [dismissed, setDismissed] = useState<string[]>([]);

  const push = (s: WarehouseState, label: string, detail?: string): WarehouseState => ({
    ...s,
    log: [{ at: stamp(), label, detail }, ...s.log].slice(0, 60),
  });

  const runAllocation = useCallback(() => {
    setState((s) => {
      const { products, orders, notes } = allocate(s);
      toast.success("Allocation run complete", {
        description: notes.length ? notes.slice(0, 3).join(" · ") : "No changes required",
      });
      return push({ ...s, products, orders }, "Allocation engine run", `${notes.length} order(s) updated`);
    });
  }, []);

  const applyDecision = useCallback((d: Decision) => {
    setState((s) => {
      let next = { ...s };
      if (d.kind === "reallocate") {
        const { from, to, sku, qty } = d.payload as { from: string; to: string; sku: string; qty: number };
        next.orders = s.orders.map((o) => {
          if (o.id === from)
            return {
              ...o,
              status: "backorder" as OrderStatus,
              lines: o.lines.map((l) => (l.sku === sku ? { ...l, allocated: l.allocated - qty } : l)),
              events: [...o.events, { at: stamp(), label: "Stock reallocated out", detail: `${qty} × ${sku} → ${to}` }],
            };
          if (o.id === to) {
            const lines = o.lines.map((l) => (l.sku === sku ? { ...l, allocated: l.allocated + qty } : l));
            return {
              ...o,
              lines,
              status: lines.every((l) => l.allocated >= l.qty) ? ("allocated" as OrderStatus) : o.status,
              events: [...o.events, { at: stamp(), label: "Stock reallocated in", detail: `${qty} × ${sku} ← ${from}` }],
            };
          }
          return o;
        });
        next = push(next, "Reallocation applied", d.title);
      }
      if (d.kind === "reorder") {
        const { sku, qty } = d.payload as { sku: string; qty: number };
        next.products = s.products.map((p) => (p.sku === sku ? { ...p, onHand: p.onHand + Number(qty) } : p));
        next = push(next, "Purchase order raised", `${qty} × ${sku} received into stock`);
      }
      if (d.kind === "split") {
        const { orderId } = d.payload as { orderId: string };
        next.orders = s.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "picking" as OrderStatus,
                events: [...o.events, { at: stamp(), label: "Partial shipment released", detail: "Remainder back-ordered" }],
              }
            : o,
        );
        next = push(next, "Split shipment released", orderId);
      }
      toast.success("Decision applied", { description: d.title });
      return next;
    });
    setDismissed((x) => [...x, d.id]);
  }, []);

  const dismissDecision = useCallback((id: string) => setDismissed((x) => [...x, id]), []);

  const advance = useCallback((orderId: string) => {
    setState((s) => {
      const order = s.orders.find((o) => o.id === orderId);
      if (!order) return s;
      const target = nextStage[order.status];
      if (!target) {
        toast.error("Cannot advance", { description: `${orderId} is ${order.status.replace("_", " ")}` });
        return s;
      }
      const labelMap: Record<string, string> = {
        picking: "Released to picking",
        packing: "Picking complete → packing",
        qc: "Packed → quality check",
        dispatched: "QC passed → dispatched",
      };
      const label = labelMap[target] ?? "Stage advanced";
      let products = s.products;
      if (target === "dispatched") {
        products = s.products.map((p) => {
          const line = order.lines.find((l) => l.sku === p.sku);
          if (!line) return p;
          return { ...p, onHand: p.onHand - line.allocated, reserved: Math.max(0, p.reserved - line.allocated) };
        });
      }
      const orders = s.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: target,
              lines: target === "packing" ? o.lines.map((l) => ({ ...l, picked: l.allocated })) : o.lines,
              events: [...o.events, { at: stamp(), label }],
            }
          : o,
      );
      toast.success(label, { description: orderId });
      return push({ ...s, orders, products }, label, orderId);
    });
  }, []);

  const reportException = useCallback<Ctx["reportException"]>((input) => {
    setState((s) => {
      const id = `EXC-${300 + s.exceptions.length}`;
      const products = s.products.map((p) =>
        p.sku === input.sku && (input.type === "damaged" || input.type === "missing")
          ? { ...p, damaged: p.damaged + input.qty }
          : p,
      );
      const exceptions = [
        { id, type: input.type, sku: input.sku, qty: input.qty, orderId: input.orderId, openedAt: stamp(), status: "open" as const },
        ...s.exceptions,
      ];
      toast.warning("Exception logged", { description: `${id} · ${input.qty} × ${input.sku}` });
      return push({ ...s, products, exceptions }, `Exception ${id} raised`, `${input.type} · ${input.qty} × ${input.sku}`);
    });
  }, []);

  const resolveException = useCallback((id: string, resolution: string) => {
    setState((s) => {
      const exc = s.exceptions.find((e) => e.id === id);
      let products = s.products;
      if (exc && resolution === "Written off") {
        products = s.products.map((p) =>
          p.sku === exc.sku ? { ...p, onHand: Math.max(0, p.onHand - exc.qty), damaged: Math.max(0, p.damaged - exc.qty) } : p,
        );
      }
      if (exc && resolution === "Recovered to stock") {
        products = s.products.map((p) => (p.sku === exc.sku ? { ...p, damaged: Math.max(0, p.damaged - exc.qty) } : p));
      }
      toast.success("Exception resolved", { description: `${id} · ${resolution}` });
      return push(
        { ...s, products, exceptions: s.exceptions.map((e) => (e.id === id ? { ...e, status: "resolved" as const, resolution } : e)) },
        `Exception ${id} resolved`,
        resolution,
      );
    });
  }, []);

  const receiveStock = useCallback((sku: string, qty: number) => {
    setState((s) => {
      toast.success("Stock received", { description: `${qty} × ${sku}` });
      return push({ ...s, products: s.products.map((p) => (p.sku === sku ? { ...p, onHand: p.onHand + qty } : p)) }, "Inbound received", `${qty} × ${sku}`);
    });
  }, []);

  const decisions = useMemo(
    () => computeDecisions(state).filter((d) => !dismissed.includes(d.id)),
    [state, dismissed],
  );

  const value = useMemo(
    () => ({ state, decisions, runAllocation, applyDecision, dismissDecision, advance, reportException, resolveException, receiveStock }),
    [state, decisions, runAllocation, applyDecision, dismissDecision, advance, reportException, resolveException, receiveStock],
  );

  return <WarehouseContext.Provider value={value}>{children}</WarehouseContext.Provider>;
}

export function useWarehouse() {
  const ctx = useContext(WarehouseContext);
  if (!ctx) throw new Error("useWarehouse must be used inside WarehouseProvider");
  return ctx;
}

export type { Order };
