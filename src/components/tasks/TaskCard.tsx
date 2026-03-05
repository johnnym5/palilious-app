'use client';

import type { Task, UserProfile } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '../ui/card';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { FileText, Users, Building } from 'lucide-react';

interface TaskCardProps {
    task: Task;
    userProfile: UserProfile;
    permissions: Permissions;
    onSelect: (task: Task) => void;
}

const ICONS: Record<string, React.ElementType> = {
    'Client Report': FileText,
    'Team Sync': Users,
    'Inventory Check': Building,
}

const ICON_COLORS: Record<string, string> = {
    'Client Report': 'bg-orange-500/20 text-orange-400',
    'Team Sync': 'bg-blue-500/20 text-blue-400',
    'Inventory Check': 'bg-green-500/20 text-green-400',
}

const getIcon = (title: string) => {
    if (title.toLowerCase().includes('report')) return 'Client Report';
    if (title.toLowerCase().includes('sync') || title.toLowerCase().includes('meeting')) return 'Team Sync';
    if (title.toLowerCase().includes('inventory')) return 'Inventory Check';
    return 'Client Report';
}

export function TaskCard({ task, onSelect }: TaskCardProps) {

    const iconKey = getIcon(task.title);
    const Icon = ICONS[iconKey];
    const iconColor = ICON_COLORS[iconKey];

    const statusClass = () => {
         switch (task.status) {
            case 'QUEUED':
                return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'ACTIVE':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'AWAITING_REVIEW':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default:
                return '';
        }
    }

    return (
        <Card 
            className="bg-card/50 backdrop-blur-xl hover:bg-card transition-colors cursor-pointer"
            onClick={() => onSelect(task)}
        >
            <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("p-3 rounded-lg", iconColor)}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-foreground">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                        {task.dueDate ? `Due ${formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}` : 'No due date'}
                    </p>
                </div>
                <Badge variant="outline" className={cn("capitalize", statusClass())}>
                    {task.status === 'ACTIVE' ? 'In Progress' : task.status.replace('_', ' ').toLowerCase()}
                </Badge>
            </CardContent>
        </Card>
    )
}
