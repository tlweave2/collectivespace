const MAP: Record<string, [string, string]> = {
  pending_payment: ["Awaiting payment", "warn"], confirmed: ["Deposit paid", "ok"], paid: ["Paid in full", "ok"],
  balance_failed: ["Payment failed", "bad"], completed: ["Completed", ""], cancelled: ["Cancelled", "bad"], expired: ["Expired", ""],
};
export default function StatusBadge({ status }: { status: string }) {
  const [label, tone] = MAP[status] ?? [status, ""];
  return <span className={`badge ${tone}`}>{label}</span>;
}
