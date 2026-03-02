'use client';
import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Zap, Target, CheckSquare } from "lucide-react";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const priorityStyles: Record<TaskPriority, string> = {
  CRITICAL: "bg-rose-500/20 text-rose-500 border-rose-500/30 hover:bg-rose-500/30 animate-pulse",
  OPERATIONAL: "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30",
  ROUTINE: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80",
};

const priorityIcons: Record<TaskPriority, React.ElementType> = {
    CRITICAL: Zap,
    OPERATIONAL: Target,
    ROUTINE: CheckSquare
}

export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
  const Icon = priorityIcons[priority];
  return (
    <Badge variant="outline" className={cn("font-medium text-xs gap-1.5", priorityStyles[priority], className)}>
      <Icon className="h-3 w-3" />
      {priority}
    </Badge>
  );
}
