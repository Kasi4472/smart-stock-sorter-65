import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Boxes, Clock, PlayCircle, Truck, Zap } from "lucide-react";
import { Shell } from "@/components/warehouse/shell";
import { Stat, StatusChip, PriorityBadge, Bar, Chip } from "@/components/warehouse/bits";
import { DecisionFeed } from "@/components/warehouse/decision-feed";
import { Button } from "@/components/ui/button";
import { useWarehouse } from "@/lib/warehouse/store";
import { available, bottleneck, fillRate, priorityScore, stockState } from "@/lib/warehouse/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Control Tower — Flowdock Warehouse Ops" },
      {
        name: "description",
        content:
          "Live warehouse control tower: SLA risk, allocation conflicts, stock health and recommended operational decisions.",
      },
      { property: "og:title", content: "Control Tower — Flowdock Warehouse Ops" },
      {
        property: "og:description",
        content: "Live allocation conflicts, SLA risk and recommended decisions for warehouse teams.",
      },
    ],
  }),
  component: ControlTower,
});

function ControlTower() {
  const { state, runAllocation, decisions } = useWarehouse();
  const { products, orders, exceptions, log } = state;

  const openOrders = orders.filter((o) => o.status !== "dispatched");
  const atRisk = openOrders.filter((o) => o.dueInHours <= 8);
  const backorders = orders.filter((o) => o.status === "backorder");
  const lowStock = products.filter((p) => ["low", "critical", "out"].includes(stockState(p)));
  const neck = bottleneck(openOrders);

  const queue = [...openOrders]
    .sort((a, b) => priorityScore(b, products) - priorityScore(a, products))
    .slice(0, 6);

  return (
    <Shell
      title="Control Tower"
      subtitle="Live operational picture across allocation, floor and dispatch"
      actions={
        <Button onClick={runAllocation}>
          <PlayCircle className="size-4" /> Run allocation engine
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Open orders" value={openOrders.length} hint={`${orders.length - openOrders.length} dispatched today`} icon={<Truck className="size-4" />} />
        <Stat label="SLA at risk" value={atRisk.length} tone={atRisk.length ? "danger" : "good"} hint="Due within 8 hours" icon={<Clock className="size-4" />} />
        <Stat label="Backorders" value={backorders.length} tone={backorders.length ? "warn" : "good"} hint="Awaiting stock or reallocation" icon={<Boxes className="size-4" />} />
        <Stat label="Open exceptions" value={exceptions.filter((e) => e.status === "open").length} tone="warn" hint="Damaged / missing / QC" icon={<AlertTriangle className="size-4" />} />
        <Stat label="Decisions pending" value={decisions.length} tone={decisions.length ? "warn" : "good"} hint="Engine recommendations" icon={<Zap className="size-4" />} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider">Priority queue</h2>
            <Link to="/orders" className="text-xs text-primary hover:underline">
              All orders →
            </Link>
          </div>
          <div className="panel divide-y divide-border">
            {queue.map((o) => (
              <Link
                key={o.id}
                to="/orders"
                className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-surface-raised"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num text-sm font-bold">{o.id}</span>
                  <span className="text-sm text-muted-foreground">{o.customer}</span>
                  <PriorityBadge order={o} products={products} />
                  <StatusChip status={o.status} />
                  <span className="num ml-auto text-xs text-muted-foreground">due {o.dueInHours}h</span>
                </div>
                <Bar value={fillRate(o)} tone={fillRate(o) === 1 ? "good" : "danger"} />
                <p className="num text-[11px] text-muted-foreground">
                  {o.lines.map((l) => `${l.sku} ${l.allocated}/${l.qty}`).join("   ·   ")}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="panel p-4">
              <p className="label-caps">Bottleneck</p>
              <p className="mt-1 text-lg font-bold capitalize">{neck?.stage.replace("_", " ") ?? "None"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {neck?.count ?? 0} orders queued at this stage — the deepest work-in-progress pile on the floor.
              </p>
            </div>
            <div className="panel p-4">
              <p className="label-caps">Stock alerts</p>
              <p className="mt-1 text-lg font-bold">{lowStock.length} SKUs</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lowStock.slice(0, 5).map((p) => (
                  <Chip key={p.sku} tone={available(p) === 0 ? "danger" : "warn"}>
                    {p.sku}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider">Decision feed</h2>
            <span className="text-xs text-muted-foreground">Exception → Decision → Resolution</span>
          </div>
          <DecisionFeed limit={4} />

          <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wider">Activity log</h2>
          <div className="panel max-h-72 divide-y divide-border overflow-y-auto">
            {log.map((e, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <span className="num mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <div>
                  <p className="text-xs font-semibold">{e.label}</p>
                  {e.detail && <p className="text-[11px] text-muted-foreground">{e.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
