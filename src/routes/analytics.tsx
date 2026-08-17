import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Shell } from "@/components/warehouse/shell";
import { Stat } from "@/components/warehouse/bits";
import { DecisionFeed } from "@/components/warehouse/decision-feed";
import { useWarehouse } from "@/lib/warehouse/store";
import { bottleneck, fillRate, daysOfCover } from "@/lib/warehouse/engine";
import { stageDwell, throughput } from "@/lib/warehouse/mock";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Operational Analytics — Flowdock Warehouse Ops" },
      {
        name: "description",
        content: "Throughput, stage dwell time, fill rate and bottleneck analysis for warehouse fulfillment teams.",
      },
      { property: "og:title", content: "Operational Analytics — Flowdock Warehouse Ops" },
      { property: "og:description", content: "Throughput, dwell time, fill rate and bottleneck analysis." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { state } = useWarehouse();
  const open = state.orders.filter((o) => o.status !== "dispatched");
  const avgFill = open.length ? open.reduce((s, o) => s + fillRate(o), 0) / open.length : 1;
  const neck = bottleneck(open);
  const onTime = state.orders.filter((o) => o.dueInHours > 4).length / Math.max(1, state.orders.length);

  const cover = state.products
    .map((p) => ({ sku: p.sku, cover: Math.min(30, daysOfCover(p)), lead: p.leadTimeDays }))
    .sort((a, b) => a.cover - b.cover);

  const worst = stageDwell.reduce((a, b) => (b.minutes > a.minutes ? b : a));

  return (
    <Shell title="Operational Analytics" subtitle="Where throughput is lost and which SKUs will break the flow next">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Avg fill rate" value={`${Math.round(avgFill * 100)}%`} tone={avgFill > 0.9 ? "good" : "warn"} hint="Across open orders" />
        <Stat label="SLA confidence" value={`${Math.round(onTime * 100)}%`} tone={onTime > 0.8 ? "good" : "warn"} hint="Orders with >4h headroom" />
        <Stat label="Deepest queue" value={neck?.stage.replace("_", " ") ?? "—"} hint={`${neck?.count ?? 0} orders waiting`} />
        <Stat label="Slowest stage" value={`${worst.stage} · ${worst.minutes}m`} tone="warn" hint="Median dwell time" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="panel p-4">
          <h2 className="text-sm font-bold">Throughput by hour</h2>
          <p className="text-xs text-muted-foreground">Units picked, packed and dispatched</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="picked" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.18} />
                <Area type="monotone" dataKey="packed" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} />
                <Area type="monotone" dataKey="dispatched" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="text-sm font-bold">Stage dwell time</h2>
          <p className="text-xs text-muted-foreground">Median minutes an order sits in each stage</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageDwell}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="stage" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                  {stageDwell.map((s) => (
                    <Cell key={s.stage} fill={s.minutes === worst.minutes ? "var(--chart-4)" : "var(--chart-1)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="text-sm font-bold">Days of cover vs lead time</h2>
          <p className="text-xs text-muted-foreground">SKUs left of their lead time will stock out before replenishment</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cover} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="sku" stroke="var(--muted-foreground)" fontSize={10} width={78} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="cover" radius={[0, 4, 4, 0]}>
                  {cover.map((c) => (
                    <Cell key={c.sku} fill={c.cover <= c.lead ? "var(--chart-4)" : "var(--chart-3)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">Recommended interventions</h2>
          <DecisionFeed limit={4} />
        </section>
      </div>
    </Shell>
  );
}
