'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Task, UserProfile, TaskStatus } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCard } from '@/components/tasks/TaskCard';
import { ListChecks } from 'lucide-react';

const statusTabs: { name: string; statuses: TaskStatus[] }[] = [
    { name: "Active", statuses: ["QUEUED", "ACTIVE"] },
    { name: "Review", statuses: ["AWAITING_REVIEW"] },
    { name: "Archived", statuses: ["ARCHIVED"] },
];

export default function TasksPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null, 
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const permissions = usePermissions(userProfile);

  const taskIdFromUrl = searchParams.get('taskId');
  const taskFromUrlRef = useMemoFirebase(() => 
    taskIdFromUrl ? doc(firestore, 'tasks', taskIdFromUrl) : null,
  [firestore, taskIdFromUrl]);
  const { data: taskFromUrl } = useDoc<Task>(taskFromUrlRef);

  useEffect(() => {
    if (taskFromUrl) {
      setSelectedTask(taskFromUrl);
    }
  }, [taskFromUrl]);

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedTask(null);
      router.replace(pathname, {scroll: false}); 
    }
  };

  const finalTasksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const tasksRef = collection(firestore, 'tasks');
    if (permissions.canAccessAllTasks) {
        return query(tasksRef, where('orgId', '==', userProfile.orgId));
    } else {
        return query(tasksRef, where('assignedTo', '==', userProfile.id));
    }
  }, [firestore, userProfile, permissions.canAccessAllTasks]);


  const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(finalTasksQuery);

  const storageKey = 'tasks-view-tab';
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
        const savedTab = localStorage.getItem(storageKey);
        if (savedTab) return savedTab;
    }
    return 'Active';
  });

  useEffect(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, activeTab);
      }
  }, [activeTab]);
  
  const isLoading = isProfileLoading || areTasksLoading;

  return (
    <div className="space-y-6 h-full flex flex-col">
       <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Task Manager</h1>
          <p className="text-muted-foreground">
            {permissions.canManageStaff ? "Monitor tasks across your team." : "Your personal task board."}
          </p>
         </div>
       </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : userProfile && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList>
                {statusTabs.map(tab => (
                    <TabsTrigger key={tab.name} value={tab.name}>{tab.name}</TabsTrigger>
                ))}
            </TabsList>
            {statusTabs.map(tab => {
                 const filteredTasks = tasks?.filter(t => tab.statuses.includes(t.status))
                    .sort((a,b) => {
                        // A simple sort: due date ascending, with nulls at the end
                        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                        if (a.dueDate) return -1;
                        if (b.dueDate) return 1;
                        return 0;
                    }) || [];
                return (
                 <TabsContent key={tab.name} value={tab.name} className="mt-4">
                    {filteredTasks.length > 0 ? (
                        <div className="space-y-3">
                            {filteredTasks.map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    userProfile={userProfile} 
                                    permissions={permissions}
                                    onSelect={() => setSelectedTask(task)}
                                />
                            ))}
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground rounded-lg bg-secondary/30">
                            <ListChecks className="h-12 w-12 mb-4" />
                            <p className="font-semibold">All Clear!</p>
                            <p className="text-sm">No tasks in this category.</p>
                        </div>
                    )}
                 </TabsContent>
                )
            })}
        </Tabs>
      )}

      {selectedTask && userProfile && (
        <TaskDetailDialog
          task={selectedTask}
          isOpen={!!selectedTask}
          onOpenChange={handleDialogClose}
          currentUserProfile={userProfile}
          permissions={permissions}
        />
      )}
    </div>
  );
}
