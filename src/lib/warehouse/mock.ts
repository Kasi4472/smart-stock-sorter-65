import type { Order, Product, WarehouseException } from "./types";

export const products: Product[] = [
  { sku: "SKU-1001", name: "Aurora Wireless Headset", category: "Audio", zone: "A", bin: "A-04-12", onHand: 12, reserved: 5, damaged: 1, reorderPoint: 25, reorderQty: 120, unitCost: 62, leadTimeDays: 6, dailyDemand: 9 },
  { sku: "SKU-1002", name: "Nomad 20K Power Bank", category: "Power", zone: "A", bin: "A-07-03", onHand: 142, reserved: 0, damaged: 0, reorderPoint: 60, reorderQty: 200, unitCost: 18, leadTimeDays: 4, dailyDemand: 14 },
  { sku: "SKU-1003", name: "Kestrel Mechanical Keyboard", category: "Peripherals", zone: "B", bin: "B-02-08", onHand: 34, reserved: 0, damaged: 2, reorderPoint: 40, reorderQty: 100, unitCost: 74, leadTimeDays: 9, dailyDemand: 6 },
  { sku: "SKU-1004", name: "Orbit 4K Webcam", category: "Video", zone: "B", bin: "B-05-01", onHand: 0, reserved: 0, damaged: 0, reorderPoint: 30, reorderQty: 90, unitCost: 55, leadTimeDays: 7, dailyDemand: 5 },
  { sku: "SKU-1005", name: "Slate Laptop Stand", category: "Accessories", zone: "C", bin: "C-01-05", onHand: 88, reserved: 0, damaged: 0, reorderPoint: 35, reorderQty: 120, unitCost: 21, leadTimeDays: 3, dailyDemand: 11 },
  { sku: "SKU-1006", name: "Halo Desk Lamp", category: "Lighting", zone: "C", bin: "C-06-11", onHand: 19, reserved: 0, damaged: 3, reorderPoint: 25, reorderQty: 80, unitCost: 29, leadTimeDays: 5, dailyDemand: 4 },
  { sku: "SKU-1007", name: "Pulse Fitness Band", category: "Wearables", zone: "A", bin: "A-01-09", onHand: 63, reserved: 0, damaged: 0, reorderPoint: 45, reorderQty: 150, unitCost: 34, leadTimeDays: 8, dailyDemand: 12 },
  { sku: "SKU-1008", name: "Cobalt USB-C Hub", category: "Peripherals", zone: "B", bin: "B-09-04", onHand: 11, reserved: 0, damaged: 0, reorderPoint: 30, reorderQty: 140, unitCost: 27, leadTimeDays: 4, dailyDemand: 10 },
  { sku: "SKU-1009", name: "Terra Insulated Bottle", category: "Lifestyle", zone: "D", bin: "D-03-02", onHand: 210, reserved: 0, damaged: 4, reorderPoint: 70, reorderQty: 250, unitCost: 12, leadTimeDays: 3, dailyDemand: 18 },
  { sku: "SKU-1010", name: "Vertex Gaming Mouse", category: "Peripherals", zone: "B", bin: "B-02-15", onHand: 26, reserved: 0, damaged: 1, reorderPoint: 40, reorderQty: 110, unitCost: 41, leadTimeDays: 6, dailyDemand: 8 },
];

const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();

export const orders: Order[] = [
  {
    id: "ORD-4821", customer: "Northwind Retail", channel: "B2B", tier: "vip", createdAt: ago(5), dueInHours: 4, status: "new",
    lines: [{ sku: "SKU-1001", qty: 10, allocated: 0, picked: 0 }, { sku: "SKU-1005", qty: 4, allocated: 0, picked: 0 }],
    events: [{ at: ago(5), label: "Order received", detail: "B2B channel" }],
  },
  {
    id: "ORD-4822", customer: "Ana Sørensen", channel: "Direct", tier: "standard", createdAt: ago(9), dueInHours: 30, status: "allocated",
    lines: [{ sku: "SKU-1001", qty: 5, allocated: 5, picked: 0 }],
    events: [{ at: ago(9), label: "Order received" }, { at: ago(8), label: "Stock allocated", detail: "SKU-1001 5/5" }],
  },
  {
    id: "ORD-4823", customer: "Bright Labs", channel: "Marketplace", tier: "express", createdAt: ago(2), dueInHours: 8, status: "picking",
    lines: [{ sku: "SKU-1003", qty: 6, allocated: 6, picked: 0 }, { sku: "SKU-1010", qty: 6, allocated: 6, picked: 0 }],
    events: [{ at: ago(2), label: "Order received" }],
  },
  {
    id: "ORD-4824", customer: "Halcyon Studio", channel: "Retail", tier: "standard", createdAt: ago(18), dueInHours: 20, status: "new",
    lines: [{ sku: "SKU-1004", qty: 3, allocated: 0, picked: 0 }, { sku: "SKU-1009", qty: 12, allocated: 0, picked: 0 }],
    events: [{ at: ago(18), label: "Order received" }],
  },
  {
    id: "ORD-4825", customer: "Meridian Corp", channel: "B2B", tier: "vip", createdAt: ago(1), dueInHours: 6, status: "new",
    lines: [{ sku: "SKU-1002", qty: 40, allocated: 0, picked: 0 }, { sku: "SKU-1007", qty: 20, allocated: 0, picked: 0 }],
    events: [{ at: ago(1), label: "Order received" }],
  },
  {
    id: "ORD-4826", customer: "Juno Kim", channel: "Direct", tier: "express", createdAt: ago(3), dueInHours: 2, status: "new",
    lines: [{ sku: "SKU-1008", qty: 4, allocated: 0, picked: 0 }],
    events: [{ at: ago(3), label: "Order received" }],
  },
  {
    id: "ORD-4827", customer: "Foundry Supply", channel: "B2B", tier: "standard", createdAt: ago(26), dueInHours: 14, status: "qc",
    lines: [{ sku: "SKU-1006", qty: 8, allocated: 8, picked: 8 }, { sku: "SKU-1009", qty: 30, allocated: 30, picked: 30 }],
    events: [{ at: ago(26), label: "Order received" }],
  },
  {
    id: "ORD-4828", customer: "Lumen Cafe", channel: "Retail", tier: "standard", createdAt: ago(12), dueInHours: 40, status: "new",
    lines: [{ sku: "SKU-1005", qty: 10, allocated: 0, picked: 0 }],
    events: [{ at: ago(12), label: "Order received" }],
  },
  {
    id: "ORD-4829", customer: "Perch Analytics", channel: "Marketplace", tier: "express", createdAt: ago(7), dueInHours: 10, status: "packing",
    lines: [{ sku: "SKU-1010", qty: 5, allocated: 5, picked: 5 }, { sku: "SKU-1002", qty: 6, allocated: 6, picked: 6 }],
    events: [{ at: ago(7), label: "Order received" }],
  },
  {
    id: "ORD-4830", customer: "Vela Interiors", channel: "Retail", tier: "standard", createdAt: ago(31), dueInHours: 52, status: "dispatched",
    lines: [{ sku: "SKU-1006", qty: 6, allocated: 6, picked: 6 }],
    events: [{ at: ago(31), label: "Order received" }],
  },
];

export const exceptions: WarehouseException[] = [
  { id: "EXC-201", type: "damaged", sku: "SKU-1006", qty: 3, openedAt: ago(11), status: "open" },
  { id: "EXC-202", type: "missing", sku: "SKU-1003", qty: 2, orderId: "ORD-4823", openedAt: ago(4), status: "open" },
];

export const throughput = [
  { hour: "06", picked: 18, packed: 12, dispatched: 8 },
  { hour: "08", picked: 34, packed: 27, dispatched: 21 },
  { hour: "10", picked: 51, packed: 39, dispatched: 30 },
  { hour: "12", picked: 44, packed: 41, dispatched: 36 },
  { hour: "14", picked: 62, packed: 45, dispatched: 38 },
  { hour: "16", picked: 57, packed: 52, dispatched: 47 },
  { hour: "18", picked: 39, packed: 44, dispatched: 43 },
];

export const stageDwell = [
  { stage: "Allocation", minutes: 6 },
  { stage: "Picking", minutes: 34 },
  { stage: "Packing", minutes: 12 },
  { stage: "QC", minutes: 21 },
  { stage: "Dispatch", minutes: 9 },
];
