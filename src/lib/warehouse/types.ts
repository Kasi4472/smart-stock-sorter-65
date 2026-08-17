export type Tier = "vip" | "express" | "standard";

export type Product = {
  sku: string;
  name: string;
  category: string;
  zone: string;
  bin: string;
  onHand: number;
  reserved: number;
  damaged: number;
  reorderPoint: number;
  reorderQty: number;
  unitCost: number;
  leadTimeDays: number;
  dailyDemand: number;
};

export type OrderLine = {
  sku: string;
  qty: number;
  allocated: number;
  picked: number;
};

export type OrderStatus =
  | "new"
  | "allocated"
  | "backorder"
  | "picking"
  | "packing"
  | "qc"
  | "dispatched"
  | "on_hold";

export type OrderEvent = {
  at: string;
  label: string;
  detail?: string | undefined;
};

export type Order = {
  id: string;
  customer: string;
  channel: "Marketplace" | "Retail" | "B2B" | "Direct";
  tier: Tier;
  createdAt: string;
  dueInHours: number;
  status: OrderStatus;
  lines: OrderLine[];
  events: OrderEvent[];
  assignee?: string | undefined;
};

export type ExceptionType = "damaged" | "missing" | "short_pick" | "qc_fail";

export type WarehouseException = {
  id: string;
  type: ExceptionType;
  sku: string;
  qty: number;
  orderId?: string | undefined;
  openedAt: string;
  status: "open" | "resolved";
  resolution?: string | undefined;
};

export type Decision = {
  id: string;
  kind: "reallocate" | "reorder" | "split" | "expedite";
  severity: "critical" | "warning" | "info";
  title: string;
  rationale: string;
  action: string;
  payload: Record<string, string | number>;
};

export type WarehouseState = {
  products: Product[];
  orders: Order[];
  exceptions: WarehouseException[];
  log: OrderEvent[];
};
