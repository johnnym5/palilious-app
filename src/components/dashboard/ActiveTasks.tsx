'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Task, TaskStatus } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Circle, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { formatDistanceToNow } from "date-fns";
import { TaskPriorityBadge } from "../tasks/TaskPriorityBadge";
import { useMemo } from "react";

const statusIcons: Record<Exclude<TaskStatus, 'ARCHIVED' | 'COMPLETED'>, React.ElementType> = {
    QUEUED: Circle,
    ACTIVE: Clock,
    AWAITING_REVIEW: ShieldCheck,
};

const statusColors: Record<Exclude<TaskStatus, 'ARCHIVED' | 'COMPLETED'>, string> = {
    QUEUED: "text-muted-foreground",
    ACTIVE: "text-primary",
    AWAITING_REVIEW: "text-amber-500",
}

export function ActiveTasks() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    // Simplified query to avoid composite index.
    const tasksQuery = useMemoFirebase(() => {
        if (!authUser) return null;
        return query(
            collection(firestore, 'tasks'),
            where('assignedTo', '==', authUser.uid),
            where('status', 'in', ['QUEUED', 'ACTIVE', 'AWAITING_REVIEW'])
        );
    }, [firestore, authUser]);

    const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);

    // Perform sorting and limiting on the client side.
    const displayedTasks = useMemo(() => {
        if (!tasks) return [];
        return tasks.sort((a, b) => {
            // Sort by status descending (QUEUED > AWAITING_REVIEW > ACTIVE)
            if (a.status > b.status) return -1;
            if (a.status < b.status) return 1;
            
            // Then by due date ascending
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }).slice(0, 5);
    }, [tasks]);


  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Mission Log</CardTitle>
            <CardDescription>Your most recent, non-archived directives.</CardDescription>
        </div>
        <Link href="/tasks" passHref>
          <Button variant="ghost" size="sm">
            View All <ArrowRight className="ml-2 h-4 w-4"/>
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            {!isLoading && displayedTasks.length === 0 && (
                 <p className="text-sm text-muted-foreground text-center pt-16">No active missions. All clear!</p>
            )}
            {!isLoading && displayedTasks.map(task => {
                const StatusIcon = statusIcons[task.status as Exclude<TaskStatus, 'ARCHIVED' | 'COMPLETED'>];
                const colorClass = statusColors[task.status as Exclude<TaskStatus, 'ARCHIVED' | 'COMPLETED'>];
                return (
                    <div key={task.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-secondary/50">
                        <StatusIcon className={`h-5 w-5 ${colorClass}`} />
                        <div className="flex-1">
                            <p className="font-medium text-foreground text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground">Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</p>
                        </div>
                        <TaskPriorityBadge priority={task.priority} />
                    </div>
                )
            })}
        </div>
      </CardContent>
    </Card>
  );
}
