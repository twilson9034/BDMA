import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  operational: { label: "Operational", className: "status-operational border" },
  in_maintenance: { label: "In Maintenance", className: "status-in-maintenance border" },
  down: { label: "Down", className: "status-down border" },
  retired: { label: "Retired", className: "bg-muted text-muted-foreground border-muted" },
  pending_inspection: { label: "Pending Inspection", className: "status-pending border" },
  open: { label: "Open", className: "status-pending border" },
  in_progress: { label: "In Progress", className: "status-in-maintenance border" },
  paused: { label: "Paused", className: "status-pending border" },
  on_hold: { label: "On Hold", className: "bg-muted text-muted-foreground border-muted" },
  completed: { label: "Completed", className: "status-operational border" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-muted" },
  ready_for_review: { label: "Ready for Review", className: "status-in-maintenance border" },
  rescheduled: { label: "Rescheduled", className: "status-pending border" },
  pending: { label: "Pending", className: "status-pending border" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-muted" },
  submitted: { label: "Submitted", className: "status-pending border" },
  approved: { label: "Approved", className: "status-operational border" },
  rejected: { label: "Rejected", className: "status-down border" },
  ordered: { label: "Ordered", className: "status-in-maintenance border" },
  received: { label: "Received", className: "status-operational border" },
  sent: { label: "Sent", className: "status-in-maintenance border" },
  acknowledged: { label: "Acknowledged", className: "status-pending border" },
  partial: { label: "Partial", className: "status-in-maintenance border" },
  safe: { label: "Safe", className: "status-operational border" },
  defects_noted: { label: "Defects Noted", className: "status-in-maintenance border" },
  unsafe: { label: "Unsafe", className: "status-down border" },
  new: { label: "New", className: "status-pending border" },
  under_review: { label: "Under Review", className: "status-in-maintenance border" },
  planned: { label: "Planned", className: "status-pending border" },
  declined: { label: "Declined", className: "bg-muted text-muted-foreground border-muted" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs font-medium", config.className, className)}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </Badge>
  );
}
