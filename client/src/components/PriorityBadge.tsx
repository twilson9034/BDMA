import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";

interface PriorityBadgeProps {
  priority: string;
  showIcon?: boolean;
  className?: string;
}

const priorityConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  critical: {
    label: "Critical",
    className: "priority-critical border",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  high: {
    label: "High",
    className: "priority-high border",
    icon: <ArrowUp className="h-3 w-3" />,
  },
  medium: {
    label: "Medium",
    className: "priority-medium border",
    icon: <Minus className="h-3 w-3" />,
  },
  low: {
    label: "Low",
    className: "priority-low border",
    icon: <ArrowDown className="h-3 w-3" />,
  },
};

export function PriorityBadge({ priority, showIcon = true, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs font-medium gap-1", config.className, className)}
      data-testid={`priority-badge-${priority}`}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}
