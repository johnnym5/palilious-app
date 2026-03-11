'use client';

import type { Task, UserProfile } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '../ui/card';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { FileText, Users, Building } from 'lucide-react';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface TaskCardProps {
    task: Task;
    userProfile: UserProfile;
    permissions: Permissions;
    onSelect: (task: Task) => void;
}

export function TaskCard({ task, userProfile, onSelect }: TaskCardProps) {

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

    return (
        <Card 
            className="bg-card/50 backdrop-blur-xl hover:bg-card hover:shadow-md transition-all cursor-pointer"
            onClick={() => onSelect(task)}
        >
            <CardContent className="p-4 space-y-3">
                 <div className="flex items-center justify-between">
                    <TaskPriorityBadge priority={task.priority} />
                    <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{getInitials(task.assignedToName)}</AvatarFallback>
                    </Avatar>
                </div>
                <p className="font-semibold text-foreground leading-snug">{task.title}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{task.id.substring(0,6).toUpperCase()}</span>
                </div>
            </CardContent>
        </Card>
    )
}
