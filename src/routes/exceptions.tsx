import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/warehouse/shell";
import { Chip, Stat } from "@/components/warehouse/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWarehouse } from "@/lib/warehouse/store";
import type { ExceptionType } from "@/lib/warehouse/types";

export const Route = createFileRoute("/exceptions")({
  head: () => ({
    meta: [
      { title: "Exception Desk — Flowdock Warehouse Ops" },
      {
        name: "description",
        content: "Log and resolve damaged stock, missing units, short picks and QC failures with guided resolutions.",
      },
      { property: "og:title", content: "Exception Desk — Flowdock Warehouse Ops" },
      { property: "og:description", content: "Resolve damaged stock, missing units, short picks and QC failures." },
    ],
  }),
  component: ExceptionsPage,
});

const resolutions = ["Written off", "Recovered to stock", "Recount confirmed", "Replacement picked", "Supplier claim raised"];

const guidance: Record<ExceptionType, string> = {
  damaged: "Quarantine the units, write off if unsellable, then re-run allocation so affected orders re-plan against real stock.",
  missing: "Trigger a cycle count in the bin. If the count confirms the loss, write off and reorder before cover drops below lead time.",
  short_pick: "Split the shipment for what is on the trolley and back-order the balance — protects the SLA on the fillable lines.",
  qc_fail: "Send the carton back to packing, re-pick replacement units and flag the packer for a coaching note.",
};

function ExceptionsPage() {
  const { state, reportException, resolveException } = useWarehouse();
  const [sku, setSku] = useState(state.products[0]?.sku ?? "");
  const [qty, setQty] = useState("1");
  const [type, setType] = useState<ExceptionType>("damaged");

  const open = state.exceptions.filter((e) => e.status === "open");
  const resolved = state.exceptions.filter((e) => e.status === "resolved");

  return (
    <Shell title="Exception Desk" subtitle="Exception → Decision → Resolution, with inventory kept honest at every step">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open exceptions" value={open.length} tone={open.length ? "danger" : "good"} hint="Blocking or at-risk work" />
        <Stat label="Resolved today" value={resolved.length} tone="good" hint="Closed with an audit trail" />
        <Stat
          label="Units quarantined"
          value={state.products.reduce((s, p) => s + p.damaged, 0)}
          tone="warn"
          hint="Held out of available stock"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          {open.length === 0 && (
            <div className="panel p-6 text-center text-sm text-muted-foreground">No open exceptions. Floor is clean.</div>
          )}
          {open.map((e) => (
            <article key={e.id} className="panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="num text-sm font-bold">{e.id}</span>
                <Chip tone="danger">{e.type.replace("_", " ")}</Chip>
                <span className="num text-xs text-muted-foreground">
                  {e.qty} × {e.sku}
                </span>
                {e.orderId && <Chip tone="info">{e.orderId}</Chip>}
                <span className="num ml-auto text-[11px] text-muted-foreground">
                  {new Date(e.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Recommended: </span>
                {guidance[e.type]}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {resolutions.map((r) => (
                  <Button key={r} size="sm" variant="secondary" onClick={() => resolveException(e.id, r)}>
                    {r}
                  </Button>
                ))}
              </div>
            </article>
          ))}

          {resolved.length > 0 && (
            <>
              <h2 className="mt-3 text-sm font-bold uppercase tracking-wider">Resolved</h2>
              <div className="panel divide-y divide-border">
                {resolved.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-2 p-3 text-xs">
                    <span className="num font-bold">{e.id}</span>
                    <Chip tone="muted">{e.type.replace("_", " ")}</Chip>
                    <span className="num text-muted-foreground">
                      {e.qty} × {e.sku}
                    </span>
                    <Chip tone="good" className="ml-auto">
                      {e.resolution}
                    </Chip>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="panel h-fit p-4">
          <h2 className="text-sm font-bold">Log an exception</h2>
          <p className="mt-1 text-xs text-muted-foreground">Raised from the floor scanner or supervisor terminal.</p>

          <div className="mt-3 flex flex-col gap-3">
            <div>
              <p className="label-caps mb-1">SKU</p>
              <Select value={sku} onValueChange={setSku}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.products.map((p) => (
                    <SelectItem key={p.sku} value={p.sku}>
                      {p.sku} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="label-caps mb-1">Type</p>
              <Select value={type} onValueChange={(v) => setType(v as ExceptionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="missing">Missing / not in bin</SelectItem>
                  <SelectItem value="short_pick">Short pick</SelectItem>
                  <SelectItem value="qc_fail">QC failure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="label-caps mb-1">Quantity</p>
              <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" />
            </div>
            <Button
              onClick={() => reportException({ sku, qty: Math.max(1, Number(qty) || 1), type })}
            >
              Raise exception
            </Button>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
