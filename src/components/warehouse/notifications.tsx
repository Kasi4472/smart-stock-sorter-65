import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Chip } from "./bits";
import { useWarehouse } from "@/lib/warehouse/store";
import { buildSuggestions } from "@/lib/warehouse/suggestions";

const toneFor = (s: "critical" | "warning" | "info") =>
  s === "critical" ? "danger" : s === "warning" ? "warn" : "info";

export function NotificationBell() {
  const { state, decisions } = useWarehouse();
  const suggestions = useMemo(() => buildSuggestions(state, decisions), [state, decisions]);

  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const seen = useRef<Set<string> | null>(null);

  const unread = suggestions.filter((s) => !readIds.includes(s.id));

  // Toast newly generated suggestions as they appear (skip the initial batch).
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(suggestions.map((s) => s.id));
      return;
    }
    const fresh = suggestions.filter((s) => !seen.current!.has(s.id));
    fresh.forEach((s) => {
      seen.current!.add(s.id);
      const fn = s.severity === "critical" ? toast.error : s.severity === "warning" ? toast.warning : toast.info;
      fn(`AI suggestion · ${s.title}`, { description: s.detail });
    });
  }, [suggestions]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setReadIds(suggestions.map((s) => s.id));
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          <Bell className="size-4" />
          <span className="hidden sm:inline">AI suggestions</span>
          {unread.length > 0 && (
            <span className="num absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Sparkles className="size-4 text-primary" />
          <p className="text-sm font-semibold">AI suggestions</p>
          <span className="num ml-auto text-[10px] text-muted-foreground">
            {suggestions.length} SIGNAL{suggestions.length === 1 ? "" : "S"}
          </span>
        </div>
        <ScrollArea className="max-h-[22rem]">
          {suggestions.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Nothing needs attention. The floor is running clean.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {suggestions.map((s) => (
                <li key={s.id} className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip tone={toneFor(s.severity)}>{s.severity}</Chip>
                    <Chip tone="muted">{s.category}</Chip>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold leading-snug">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
                  {s.to && (
                    <Link
                      to={s.to}
                      onClick={() => setOpen(false)}
                      className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                    >
                      Open →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
