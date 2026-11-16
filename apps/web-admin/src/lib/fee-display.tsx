import { Badge } from "@/components/ui/badge";

export function feeStatusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID") return "Paid";
  if (s === "DUE" || s === "SENT") return "Pending";
  if (s === "PARTIAL") return "Partially Paid";
  if (s === "OVERDUE") return "Overdue";
  if (s === "WAIVED") return "Waived";
  if (s === "REJECTED") return "Rejected";
  return status;
}

export function FeeStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  let variant: "success" | "warning" | "danger" | "secondary" | "outline" = "outline";
  if (s === "PAID" || s === "WAIVED") variant = "success";
  else if (s === "PARTIAL" || s === "SENT" || s === "DUE") variant = "warning";
  else if (s === "OVERDUE" || s === "REJECTED") variant = "danger";

  return <Badge variant={variant}>{feeStatusLabel(status)}</Badge>;
}