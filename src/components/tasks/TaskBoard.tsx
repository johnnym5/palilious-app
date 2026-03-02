'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import type { Task, UserProfile, TaskStatus } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { TaskCard } from './TaskCard';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useMemo } from 'react';

interface TaskBoardProps {
    userProfile: UserProfile;
    permissions: Permissions;
}

const statusColumns: TaskStatus[] = ["QUEUED", "ACTIVE", "AWAITING_REVIEW", "ARCHIVED"];

export function TaskBoard({ userProfile, permissions }: TaskBoardProps) {
    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();

    const tasksQuery = useMemoFirebase((): Query | null => {
        if (!firestore) return null;
        
        const tasksRef = collection(firestore, 'tasks');

        // Queries are simplified to avoid needing a composite index.
        // Sorting will be handled on the client-side.
        if (permissions.canManageStaff || isSuperAdmin) {
            return query(
                tasksRef, 
                where('orgId', '==', userProfile.orgId)
            );
        } else {
            return query(
                tasksRef, 
                where('assignedTo', '==', userProfile.id)
            );
        }
    }, [firestore, userProfile, permissions.canManageStaff, isSuperAdmin]);

    const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);
    
    const { groupedTasks, personnelLoad } = useMemo(() => {
        const initialGroups: Record<TaskStatus, Task[]> = {
            QUEUED: [],
            ACTIVE: [],
            AWAITING_REVIEW: [],
            ARCHIVED: [],
        };
        const load: Record<string, number> = {};

        if (!tasks) {
            return { groupedTasks: initialGroups, personnelLoad: load };
        }

        // Sort tasks by due date client-side
        const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        sortedTasks.forEach(task => {
            if (task.status === 'ACTIVE') {
                load[task.assignedTo] = (load[task.assignedTo] || 0) + 1;
            }
        });

        const grouped = sortedTasks.reduce((acc, task) => {
            if (acc[task.status]) {
                acc[task.status].push(task);
            }
            return acc;
        }, initialGroups);
        
        return { groupedTasks: grouped, personnelLoad: load };
    }, [tasks]);

    return (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
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
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                userProfile={userProfile} 
                                permissions={permissions}
                                personnelLoad={personnelLoad[task.assignedTo] || 0}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
