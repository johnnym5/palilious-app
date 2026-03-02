'use client';
import type { Task, UserProfile, TaskUpdate } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';

interface TaskCardProps {
    task: Task;
    userProfile: UserProfile;
}

export function TaskCard({ task, userProfile }: TaskCardProps) {
    const firestore = useFirestore();

    const handleStatusChange = (newStatus: 'IN_PROGRESS' | 'COMPLETED') => {
        if (!firestore) return;

        const taskRef = doc(firestore, 'tasks', task.id);
        const updateEntry: TaskUpdate = {
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
        <Card className="bg-card/70 hover:bg-card transition-colors">
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
                        <AvatarImage src={undefined /* todo: get avatar from userId */} />
                        <AvatarFallback className="text-xs">{task.assignedToName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{task.assignedToName}</span>
                </div>
                 {task.assignedTo === userProfile.id && (
                     <div className='flex gap-2'>
                        {task.status === 'PENDING' && <Button size="sm" variant="outline" onClick={() => handleStatusChange('IN_PROGRESS')}>Start Task</Button>}
                        {task.status === 'IN_PROGRESS' && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange('COMPLETED')}>Complete</Button>}
                    </div>
                 )}
            </CardFooter>
        </Card>
    )
}
