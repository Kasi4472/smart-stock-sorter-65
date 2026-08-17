import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Order, Product } from "@/lib/warehouse/types";
import { available, priorityBand, priorityScore, stockState } from "@/lib/warehouse/engine";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "warn" | "good";
  icon?: ReactNode;
}) {
  const toneClass = {
    default: "text-foreground",
    danger: "text-destructive",
    warn: "text-warning",
    good: "text-success",
  }[tone];
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="label-caps">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={cn("num mt-2 text-3xl font-bold", toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "danger" | "warn" | "good" | "info" | "primary";
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    danger: "bg-destructive/15 text-destructive",
    warn: "bg-warning/15 text-warning",
    good: "bg-success/15 text-success",
    info: "bg-info/15 text-info",
    primary: "bg-primary/15 text-primary",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ order, products }: { order: Order; products: Product[] }) {
  const score = priorityScore(order, products);
  const band = priorityBand(score);
  const tone = band === "critical" ? "danger" : band === "high" ? "warn" : band === "medium" ? "info" : "muted";
  return (
    <Chip tone={tone}>
      <span className="num">{score}</span> {band}
    </Chip>
  );
}

export function StatusChip({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { tone: "muted" | "danger" | "warn" | "good" | "info" | "primary"; label: string }> = {
    new: { tone: "muted", label: "New" },
    allocated: { tone: "info", label: "Allocated" },
    backorder: { tone: "danger", label: "Backorder" },
    picking: { tone: "primary", label: "Picking" },
    packing: { tone: "primary", label: "Packing" },
    qc: { tone: "warn", label: "QC" },
    dispatched: { tone: "good", label: "Dispatched" },
    on_hold: { tone: "warn", label: "On hold" },
  };
  const s = map[status];
  return <Chip tone={s.tone}>{s.label}</Chip>;
}

export function StockChip({ product }: { product: Product }) {
  const s = stockState(product);
  const map = {
    out: { tone: "danger" as const, label: "Out of stock" },
    critical: { tone: "danger" as const, label: "Critical" },
    low: { tone: "warn" as const, label: "Low" },
    healthy: { tone: "good" as const, label: "Healthy" },
  };
  return (
    <Chip tone={map[s].tone}>
      {map[s].label} · <span className="num">{available(product)}</span>
    </Chip>
  );
}

export function Bar({ value, tone = "primary" }: { value: number; tone?: "primary" | "danger" | "good" }) {
  const bg = { primary: "bg-primary", danger: "bg-destructive", good: "bg-success" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}
