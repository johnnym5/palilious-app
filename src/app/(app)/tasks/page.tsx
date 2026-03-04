'use client';
import { useState, useEffect } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Task, UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';

export default function TasksPage() {
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const permissions = usePermissions(userProfile);

  const taskIdFromUrl = searchParams.get('taskId');
  const taskFromUrlRef = useMemoFirebase(() => 
    taskIdFromUrl ? doc(firestore, 'tasks', taskIdFromUrl) : null
  , [firestore, taskIdFromUrl]);
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


  return (
    <div className="space-y-6 h-full flex flex-col">
       <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Smart Tasker</h1>
          <p className="text-muted-foreground">
            {permissions.canManageStaff ? "Assign and monitor tasks across your team." : "Your personal task board."}
          </p>
         </div>
       </div>

      {isProfileLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      ) : userProfile && (
        <TaskBoard userProfile={userProfile} permissions={permissions} onTaskSelect={setSelectedTask} />
      )}
      
      {userProfile && (
        <>
          <Button 
              className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg shadow-primary/30 z-40" 
              onClick={() => setIsAssignTaskOpen(true)}
              aria-label="Assign New Task"
          >
            <Plus className="h-8 w-8" />
          </Button>
          <AssignTaskDialog 
            open={isAssignTaskOpen} 
            onOpenChange={setIsAssignTaskOpen} 
            currentUserProfile={userProfile} 
            permissions={permissions}
          />
        </>
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
