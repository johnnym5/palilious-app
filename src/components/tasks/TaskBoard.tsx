'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Query } from 'firebase/firestore';
import type { Task, UserProfile, TaskStatus } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { TaskCard } from './TaskCard';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface TaskBoardProps {
    userProfile: UserProfile;
    permissions: Permissions;
}

const statusColumns: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

export function TaskBoard({ userProfile, permissions }: TaskBoardProps) {
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();

    const tasksQuery = useMemoFirebase((): Query | null => {
        if (!firestore) return null;
        
        const tasksRef = collection(firestore, 'tasks');

        if (permissions.canManageStaff || isSuperAdmin) {
            // Managers/Admins see all tasks in their org
            return query(
                tasksRef, 
                where('orgId', '==', userProfile.orgId), 
                orderBy('dueDate', 'asc')
            );
        } else {
            // Staff see only their own tasks
            return query(
                tasksRef, 
                where('assignedTo', '==', userProfile.id), 
                orderBy('dueDate', 'asc')
            );
        }
    }, [firestore, userProfile, permissions.canManageStaff, isSuperAdmin]);

    const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);
    
    const groupedTasks = useMemoFirebase(() => {
        const initialGroups: Record<TaskStatus, Task[]> = {
            PENDING: [],
            IN_PROGRESS: [],
            COMPLETED: [],
        };
        return tasks?.reduce((acc, task) => {
            if (acc[task.status]) {
                acc[task.status].push(task);
            }
            return acc;
        }, initialGroups) || initialGroups;
    }, [tasks]);

    return (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {statusColumns.map(status => (
                <div key={status} className="bg-secondary/30 rounded-xl">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">
                           {status.replace('_', ' ')}
                           <span className="ml-2 text-sm font-normal text-muted-foreground">({groupedTasks[status].length})</span>
                        </h3>
                    </div>
                    <div className="p-4 space-y-4 h-full min-h-[50vh]">
                        {isLoading && <p className="text-sm text-muted-foreground">Loading tasks...</p>}
                        {!isLoading && groupedTasks[status].length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                                <p className="text-sm">No tasks in this stage.</p>
                            </div>
                        )}
                        {!isLoading && groupedTasks[status].map(task => (
                            <TaskCard key={task.id} task={task} userProfile={userProfile} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
