import type { AccountSignal } from "../types.js";

/**
 * Mock renewal/upsell signals for the demo. Swap `to_number` for a verified
 * phone before dispatching a real SLNG call.
 */
export const MOCK_SIGNALS: Record<string, AccountSignal> = {
  northwind: {
    accountId: "rec_northwind",
    accountName: "Northwind Logistics",
    contactName: "Priya",
    toNumber: "+10000000000", // ← replace with a verified phone for live demo
    plan: "Growth (annual)",
    seats: 45,
    mrr: 3800,
    renewalDate: "2026-07-15",
    usageTrend: "up",
    healthScore: 82,
    goal: "Secure the annual renewal and pitch the Scale tier (adds SSO + advanced analytics).",
    notes: "Seat usage up 30% this quarter; added 12 users in May. Champion is the VP Ops.",
  },
  acme: {
    accountId: "rec_acme",
    accountName: "Acme Robotics",
    contactName: "Daniel",
    toNumber: "+10000000000",
    plan: "Scale (annual)",
    seats: 120,
    mrr: 9200,
    renewalDate: "2026-07-02",
    usageTrend: "down",
    healthScore: 51,
    goal: "Re-engage a cooling account before renewal; understand blockers, offer a success review.",
    notes: "Logins down 40% since April. Two support escalations unresolved. Renewal in <2 weeks.",
  },
};

export function getMockSignal(key: string): AccountSignal | undefined {
  return MOCK_SIGNALS[key];
}
