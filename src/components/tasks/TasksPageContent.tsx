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
import { PlusCircle, Sparkles, Loader2 } from 'lucide-react';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createTaskFromText } from '@/ai/flows/create-task-flow';

export function TasksPageContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [initialDialogData, setInitialDialogData] = useState<any>(null);

  const [aiTaskText, setAiTaskText] = useState('');
  const [isCreatingFromAi, setIsCreatingFromAi] = useState(false);

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
  
  const openNewTaskDialog = () => {
    setInitialDialogData(null);
    setIsAssignTaskOpen(true);
  }

  const handleCreateFromAi = async () => {
    if (!aiTaskText.trim()) return;
    setIsCreatingFromAi(true);

    try {
        const result = await createTaskFromText({ text: aiTaskText });
        setInitialDialogData({
            title: result.title,
            description: result.description,
            priority: result.priority,
            dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
        });
        setIsAssignTaskOpen(true);
    } catch (error) {
        console.error("AI Task Creation Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not create task from text. The model may be unavailable.' });
    } finally {
        setIsCreatingFromAi(false);
        setAiTaskText('');
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
            <Button onClick={openNewTaskDialog}>
                <PlusCircle className="mr-2"/>
                New Task
            </Button>
         )}
       </div>

        <div className="flex items-center gap-2">
            <Input 
                placeholder="Create a task with AI... e.g., 'Remind me to call John tomorrow afternoon'"
                value={aiTaskText}
                onChange={e => setAiTaskText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFromAi()}
            />
             <Button onClick={handleCreateFromAi} disabled={isCreatingFromAi || !aiTaskText}>
                {isCreatingFromAi ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Create
            </Button>
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
            initialData={initialDialogData}
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
