'use client';
import { useState } from 'react';
import type { Task, UserProfile, TaskUpdate, TaskStatus } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';
import { CompletionBriefDialog } from './CompletionBriefDialog';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface TaskCardProps {
    task: Task;
    userProfile: UserProfile;
    permissions: Permissions;
    personnelLoad: number;
}

const priorityBorders: Record<Task['priority'], string> = {
    CRITICAL: 'border-l-rose-500',
    OPERATIONAL: 'border-l-indigo-500',
    ROUTINE: 'border-l-slate-500'
}

export function TaskCard({ task, userProfile, permissions, personnelLoad }: TaskCardProps) {
    const firestore = useFirestore();
    const [isBriefOpen, setIsBriefOpen] = useState(false);

    const handleStatusChange = (newStatus: TaskStatus) => {
        if (!firestore) return;

        const taskRef = doc(firestore, 'tasks', task.id);
        const updateEntry: Omit<TaskUpdate, 'note'> = {
            status: newStatus,
            time: new Date().toISOString(),
            updatedBy: userProfile.id
        };

        updateDocumentNonBlocking(taskRef, {
            status: newStatus,
            updates: arrayUnion(updateEntry)
        });
    };
    
    return (
        <>
            <Card className={cn("bg-card/50 backdrop-blur-xl hover:bg-card transition-colors border-l-4", priorityBorders[task.priority])}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{task.title}</CardTitle>
                        <TaskPriorityBadge priority={task.priority} />
                    </div>
                    <CardDescription>
                        Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={undefined} />
                            <AvatarFallback className="text-xs">{task.assignedToName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className='flex items-center gap-2'>
                           <span className="text-xs text-muted-foreground">{task.assignedToName}</span>
                           {permissions.canManageStaff && <Badge variant="secondary">{personnelLoad} active</Badge>}
                        </div>
                    </div>
                    <div className='flex gap-2'>
                        {task.assignedTo === userProfile.id && (
                            <>
                                {task.status === 'QUEUED' && <Button size="sm" variant="outline" onClick={() => handleStatusChange('ACTIVE')}>Start Mission</Button>}
                                {task.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => setIsBriefOpen(true)}>Submit for Review</Button>}
                            </>
                        )}
                         {permissions.canManageStaff && task.status === 'AWAITING_REVIEW' && (
                            <>
                                 <Button size="sm" variant="destructive" disabled>Re-assign</Button>
                                 <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange('ARCHIVED')}>Approve & Archive</Button>
                            </>
                         )}
                    </div>
                </CardFooter>
            </Card>
            {isBriefOpen && (
                <CompletionBriefDialog 
                    isOpen={isBriefOpen}
                    onOpenChange={setIsBriefOpen}
                    task={task}
                    userProfile={userProfile}
                />
            )}
        </>
    )
}
