import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, MapPin, TriangleAlert } from "lucide-react";
import { Shell } from "@/components/warehouse/shell";
import { Chip, PriorityBadge } from "@/components/warehouse/bits";
import { Button } from "@/components/ui/button";
import { useWarehouse } from "@/lib/warehouse/store";
import { priorityScore } from "@/lib/warehouse/engine";
import type { Order, OrderStatus } from "@/lib/warehouse/types";

export const Route = createFileRoute("/fulfillment")({
  head: () => ({
    meta: [
      { title: "Fulfillment Floor — Flowdock Warehouse Ops" },
      {
        name: "description",
        content: "Kanban floor board for picking, packing, quality check and dispatch with zone-optimised pick paths.",
      },
      { property: "og:title", content: "Fulfillment Floor — Flowdock Warehouse Ops" },
      { property: "og:description", content: "Picking, packing, QC and dispatch board with zone-optimised pick paths." },
    ],
  }),
  component: FloorPage,
});

const columns: { status: OrderStatus; title: string; hint: string }[] = [
  { status: "allocated", title: "Ready to pick", hint: "Stock reserved" },
  { status: "picking", title: "Picking", hint: "On the floor" },
  { status: "packing", title: "Packing", hint: "Cartonisation" },
  { status: "qc", title: "Quality check", hint: "Verify before dispatch" },
  { status: "dispatched", title: "Dispatched", hint: "Handed to carrier" },
];

function FloorPage() {
  const { state, advance, reportException } = useWarehouse();

  const pickPath = (order: Order) =>
    order.lines
      .map((l) => state.products.find((p) => p.sku === l.sku))
      .filter(Boolean)
      .sort((a, b) => (a!.zone + a!.bin).localeCompare(b!.zone + b!.bin))
      .map((p) => p!.bin);

  return (
    <Shell
      title="Fulfillment Floor"
      subtitle="Pick → Pack → QC → Dispatch. Pick paths are sorted by zone and bin to cut travel time."
    >
      <div className="grid gap-3 lg:grid-cols-5">
        {columns.map((col) => {
          const items = state.orders
            .filter((o) => o.status === col.status)
            .sort((a, b) => priorityScore(b, state.products) - priorityScore(a, state.products));
          return (
            <section key={col.status} className="flex min-w-0 flex-col gap-2">
              <div className="flex items-baseline justify-between px-1">
                <div>
                  <h2 className="text-sm font-bold">{col.title}</h2>
                  <p className="text-[11px] text-muted-foreground">{col.hint}</p>
                </div>
                <span className="num text-sm font-bold text-muted-foreground">{items.length}</span>
              </div>
              <div className="flex min-h-24 flex-col gap-2 rounded-lg border border-dashed border-border p-2">
                {items.length === 0 && <p className="p-2 text-center text-[11px] text-muted-foreground">Empty</p>}
                {items.map((o) => (
                  <article key={o.id} className="panel p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="num text-sm font-bold">{o.id}</span>
                      <PriorityBadge order={o} products={state.products} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{o.customer}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <MapPin className="size-3 text-primary" />
                      {pickPath(o).map((bin, i) => (
                        <span key={bin} className="num text-[10px] text-muted-foreground">
                          {bin}
                          {i < pickPath(o).length - 1 ? " →" : ""}
                        </span>
                      ))}
                    </div>
                    {col.status !== "dispatched" && (
                      <div className="mt-2.5 flex gap-1.5">
                        <Button size="sm" className="flex-1" onClick={() => advance(o.id)}>
                          Advance <ArrowRight className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Report short pick"
                          onClick={() =>
                            reportException({
                              sku: o.lines[0]!.sku,
                              qty: 1,
                              type: col.status === "qc" ? "qc_fail" : "short_pick",
                              orderId: o.id,
                            })
                          }
                        >
                          <TriangleAlert className="size-3.5" />
                        </Button>
                      </div>
                    )}
                    {col.status === "dispatched" && (
                      <div className="mt-2">
                        <Chip tone="good">Carrier · NX Freight</Chip>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}
