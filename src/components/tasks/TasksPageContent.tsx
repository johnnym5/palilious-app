'use client';
import { useState, useEffect } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Task, UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';

export function TasksPageContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    firestore && authUser ? doc(firestore, 'users', authUser.uid) : null, 
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const permissions = usePermissions(userProfile);

  const taskIdFromUrl = searchParams.get('taskId');
  const taskFromUrlRef = useMemoFirebase(() => 
    firestore && taskIdFromUrl ? doc(firestore, 'tasks', taskIdFromUrl) : null,
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

  const isLoading = isProfileLoading;

  return (
    <div className="space-y-6 h-full flex flex-col">
       <div className="flex items-center justify-between gap-4 flex-wrap">
         <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Task Manager</h1>
          <p className="text-muted-foreground">
            {permissions.canManageStaff ? "Monitor tasks across your team." : "Your personal task board."}
          </p>
         </div>
         {userProfile && (
            <Button onClick={() => setIsAssignTaskOpen(true)}>
                <PlusCircle className="mr-2"/>
                New Task
            </Button>
         )}
       </div>

      {isLoading ? (
        <Skeleton className="h-[60vh] w-full" />
      ) : userProfile && (
        <TaskBoard 
            userProfile={userProfile}
            permissions={permissions}
            onTaskSelect={setSelectedTask}
        />
      )}

      {userProfile && (
          <AssignTaskDialog
            open={isAssignTaskOpen}
            onOpenChange={setIsAssignTaskOpen}
            currentUserProfile={userProfile}
            permissions={permissions}
            initialData={null}
        />
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
