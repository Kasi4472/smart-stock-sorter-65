import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, PlayCircle } from "lucide-react";
import { Shell } from "@/components/warehouse/shell";
import { Bar, Chip, PriorityBadge, StatusChip } from "@/components/warehouse/bits";
import { Button } from "@/components/ui/button";
import { useWarehouse } from "@/lib/warehouse/store";
import { fillRate, orderValue, priorityScore } from "@/lib/warehouse/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Order Queue — Flowdock Warehouse Ops" },
      {
        name: "description",
        content: "Priority-scored order queue with allocation coverage, SLA countdown and stage progression.",
      },
      { property: "og:title", content: "Order Queue — Flowdock Warehouse Ops" },
      { property: "og:description", content: "Priority-scored order queue with allocation coverage and SLA countdown." },
    ],
  }),
  component: OrdersPage,
});

const filters = ["all", "new", "allocated", "backorder", "picking", "dispatched"] as const;

function OrdersPage() {
  const { state, runAllocation, advance } = useWarehouse();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [selected, setSelected] = useState<string | null>(state.orders[0]?.id ?? null);

  const ranked = useMemo(
    () =>
      [...state.orders]
        .sort((a, b) => priorityScore(b, state.products) - priorityScore(a, state.products))
        .filter((o) => filter === "all" || o.status === filter),
    [state.orders, state.products, filter],
  );

  const order = state.orders.find((o) => o.id === selected) ?? ranked[0];

  return (
    <Shell
      title="Order Queue"
      subtitle="Scored on SLA urgency, customer tier, order value and age"
      actions={
        <Button onClick={runAllocation}>
          <PlayCircle className="size-4" /> Run allocation
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-semibold capitalize transition-colors",
              filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-raised">
              <tr className="label-caps">
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Priority</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Fill</th>
                <th className="px-3 py-2 text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ranked.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-surface-raised",
                    order?.id === o.id && "bg-surface-raised",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <p className="num font-bold">{o.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.customer} · {o.channel}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <PriorityBadge order={o} products={state.products} />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusChip status={o.status} />
                  </td>
                  <td className="w-28 px-3 py-2.5">
                    <Bar value={fillRate(o)} tone={fillRate(o) === 1 ? "good" : "danger"} />
                    <p className="num mt-1 text-[11px] text-muted-foreground">{Math.round(fillRate(o) * 100)}%</p>
                  </td>
                  <td className="num px-3 py-2.5 text-right">
                    <span className={o.dueInHours <= 8 ? "text-destructive" : "text-muted-foreground"}>{o.dueInHours}h</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {order && (
          <aside className="panel h-fit p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="num text-lg font-bold">{order.id}</p>
                <p className="text-sm text-muted-foreground">
                  {order.customer} · {order.channel}
                </p>
              </div>
              <Chip tone={order.tier === "vip" ? "primary" : order.tier === "express" ? "info" : "muted"}>{order.tier}</Chip>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted p-2">
                <p className="label-caps">Score</p>
                <p className="num text-lg font-bold">{priorityScore(order, state.products)}</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="label-caps">Value</p>
                <p className="num text-lg font-bold">${orderValue(order, state.products)}</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="label-caps">Due</p>
                <p className="num text-lg font-bold">{order.dueInHours}h</p>
              </div>
            </div>

            <p className="label-caps mt-4">Lines</p>
            <div className="mt-1.5 flex flex-col gap-2">
              {order.lines.map((l) => {
                const p = state.products.find((x) => x.sku === l.sku);
                return (
                  <div key={l.sku} className="rounded-md border border-border p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="num text-xs font-bold">{l.sku}</span>
                      <span className="num text-xs">
                        {l.allocated}/{l.qty}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p?.name} · bin {p?.bin}
                    </p>
                    <div className="mt-1.5">
                      <Bar value={l.allocated / l.qty} tone={l.allocated >= l.qty ? "good" : "danger"} />
                    </div>
                  </div>
                );
              })}
            </div>

            <Button className="mt-4 w-full" onClick={() => advance(order.id)}>
              Advance stage <ChevronRight className="size-4" />
            </Button>

            <p className="label-caps mt-4">Timeline</p>
            <div className="mt-1.5 flex flex-col gap-2 border-l border-border pl-3">
              {[...order.events].reverse().map((e, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold">{e.label}</p>
                  <p className="num text-[11px] text-muted-foreground">
                    {new Date(e.at).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                    {e.detail ? ` · ${e.detail}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </Shell>
  );
}
