// lib/support.js

// Categories (you can edit this list anytime)
export const SUPPORT_CATEGORIES = [
  "Courier",
  "Admin",
  "Re Checking",
  "Loadsheet",
  "Product",
  "Payment",
  "Technical",
  "Other",
];

// Priority/Severity
export const SUPPORT_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

// Ticket status lifecycle
export const SUPPORT_STATUSES = [
  "open",         // newly created by member or internal
  "in_process",   // under investigation/working
  "resolved",     // resolved/closed with outcome
  "closed",       // closed (no action)
];

// Outcomes when resolved
export const SUPPORT_OUTCOMES = [
  "refund",
  "replacement",
  "point_adjustment",
  "information_only",
  "other",
];

// SLA hours by category (you can tune per your ops)
export const CATEGORY_SLA_HOURS = {
  "Courier": 24,
  "Admin": 24,
  "Re Checking": 24,
  "Loadsheet": 24,
  "Product": 48,
  "Payment": 12,
  "Technical": 24,
  "Other": 48,
};

// Helper: compute dueAt from category + createdAt
export function computeDueAt(category, createdAt = new Date()) {
  const hours = CATEGORY_SLA_HOURS[category] ?? 24;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}
