import { ArrowRightLeft, PackagePlus, Scissors, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "./bits";
import { useWarehouse } from "@/lib/warehouse/store";
import type { Decision } from "@/lib/warehouse/types";

const icons = {
  reallocate: ArrowRightLeft,
  reorder: PackagePlus,
  split: Scissors,
  expedite: ShieldAlert,
};

export function DecisionFeed({ limit }: { limit?: number }) {
  const { decisions, applyDecision, dismissDecision } = useWarehouse();
  const list: Decision[] = limit ? decisions.slice(0, limit) : decisions;

  if (list.length === 0) {
    return (
      <div className="panel p-6 text-center">
        <p className="text-sm font-semibold">No open decisions</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Every conflict is resolved. Run the allocation engine after new orders land.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {list.map((d) => {
        const Icon = icons[d.kind];
        const tone = d.severity === "critical" ? "danger" : d.severity === "warning" ? "warn" : "info";
        return (
          <article key={d.id} className="panel p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-muted text-primary">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={tone}>{d.severity}</Chip>
                  <Chip tone="muted">{d.kind}</Chip>
                </div>
                <h3 className="mt-2 text-sm font-semibold leading-snug">{d.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d.rationale}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => applyDecision(d)}>
                    {d.action}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismissDecision(d.id)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
