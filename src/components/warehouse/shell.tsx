import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
  PackageSearch,
  Radar,
} from "lucide-react";
import type { ReactNode } from "react";
import { useWarehouse } from "@/lib/warehouse/store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Control Tower", icon: Radar },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/fulfillment", label: "Fulfillment Floor", icon: PackageSearch },
  { to: "/exceptions", label: "Exceptions", icon: AlertTriangle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function Shell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state, decisions } = useWarehouse();
  const openExceptions = state.exceptions.filter((e) => e.status === "open").length;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 md:flex">
        <div className="flex items-center gap-2 px-2 pb-6">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-sidebar-foreground">FLOWDOCK</p>
            <p className="num text-[10px] text-muted-foreground">DC-07 · NORTH BAY</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
                {item.to === "/exceptions" && openExceptions > 0 && (
                  <span className="num ml-auto rounded bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {openExceptions}
                  </span>
                )}
                {item.to === "/" && decisions.length > 0 && (
                  <span className="num ml-auto rounded bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {decisions.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-md border border-sidebar-border bg-sidebar-accent/40 p-3">
          <p className="label-caps">Shift</p>
          <p className="num mt-1 text-sm text-sidebar-foreground">DAY · 06:00–14:00</p>
          <p className="mt-1 text-xs text-muted-foreground">6 pickers · 3 packers online</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto md:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground"
                activeProps={{ className: "text-primary border-primary" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="min-w-0 flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
