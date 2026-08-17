import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PackagePlus, Search } from "lucide-react";
import { Shell } from "@/components/warehouse/shell";
import { Chip, Stat, StockChip } from "@/components/warehouse/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWarehouse } from "@/lib/warehouse/store";
import { available, daysOfCover, stockState } from "@/lib/warehouse/engine";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Health — Flowdock Warehouse Ops" },
      {
        name: "description",
        content: "SKU-level stock visibility: available vs reserved, damaged holds, days of cover and reorder signals.",
      },
      { property: "og:title", content: "Inventory Health — Flowdock Warehouse Ops" },
      { property: "og:description", content: "Available vs reserved stock, damaged holds, days of cover and reorder signals." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { state, receiveStock, reportException } = useWarehouse();
  const [q, setQ] = useState("");

  const rows = state.products.filter(
    (p) => p.sku.toLowerCase().includes(q.toLowerCase()) || p.name.toLowerCase().includes(q.toLowerCase()),
  );

  const outCount = state.products.filter((p) => stockState(p) === "out").length;
  const lowCount = state.products.filter((p) => ["low", "critical"].includes(stockState(p))).length;
  const damaged = state.products.reduce((s, p) => s + p.damaged, 0);
  const value = state.products.reduce((s, p) => s + p.onHand * p.unitCost, 0);

  return (
    <Shell title="Inventory Health" subtitle="Available = on hand − reserved − damaged holds">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Out of stock" value={outCount} tone={outCount ? "danger" : "good"} hint="Blocking allocation" />
        <Stat label="Below reorder point" value={lowCount} tone={lowCount ? "warn" : "good"} hint="Replenishment needed" />
        <Stat label="Units on damage hold" value={damaged} tone="warn" hint="Excluded from available stock" />
        <Stat label="Stock value" value={`$${value.toLocaleString()}`} hint="At unit cost" />
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU or product" className="pl-8" />
      </div>

      <div className="panel mt-3 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-surface-raised">
            <tr className="label-caps">
              <th className="px-3 py-2 text-left">SKU / Product</th>
              <th className="px-3 py-2 text-left">Location</th>
              <th className="px-3 py-2 text-right">On hand</th>
              <th className="px-3 py-2 text-right">Reserved</th>
              <th className="px-3 py-2 text-right">Damaged</th>
              <th className="px-3 py-2 text-right">Cover</th>
              <th className="px-3 py-2 text-left">State</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => {
              const cover = daysOfCover(p);
              return (
                <tr key={p.sku} className="hover:bg-surface-raised">
                  <td className="px-3 py-2.5">
                    <p className="num font-bold">{p.sku}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.name} · {p.category}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Chip tone="muted">Zone {p.zone}</Chip>
                    <p className="num mt-1 text-[11px] text-muted-foreground">{p.bin}</p>
                  </td>
                  <td className="num px-3 py-2.5 text-right">{p.onHand}</td>
                  <td className="num px-3 py-2.5 text-right text-info">{p.reserved}</td>
                  <td className="num px-3 py-2.5 text-right text-destructive">{p.damaged}</td>
                  <td className="num px-3 py-2.5 text-right">
                    <span className={cover <= p.leadTimeDays ? "text-warning" : ""}>{cover}d</span>
                    <p className="text-[11px] text-muted-foreground">lead {p.leadTimeDays}d</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <StockChip product={p} />
                    <p className="num mt-1 text-[11px] text-muted-foreground">
                      avail {available(p)} / ROP {p.reorderPoint}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => receiveStock(p.sku, p.reorderQty)}>
                        <PackagePlus className="size-3.5" /> Receive {p.reorderQty}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reportException({ sku: p.sku, qty: 1, type: "damaged" })}
                      >
                        Flag damage
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
