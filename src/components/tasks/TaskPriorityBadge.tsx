'use client';
import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const priorityStyles: Record<TaskPriority, string> = {
  URGENT: "bg-rose-500/20 text-rose-500 border-rose-500/30 hover:bg-rose-500/30",
  NORMAL: "bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30",
  LOW: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80",
};

export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", priorityStyles[priority], className)}>
      {priority}
    </Badge>
  );
}
