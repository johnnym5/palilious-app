'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Task, UserProfile, ActivityEntry, SubTask } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { Calendar, CheckSquare, History, Info, BookOpenCheck, User, Plus, Trash2, Share2, Pencil } from 'lucide-react';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { useState } from 'react';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ActivityFeed } from '../shared/ActivityFeed';
import { ShareTaskDialog } from './ShareTaskDialog';
import { EditTaskDialog } from './EditTaskDialog';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUserProfile: UserProfile;
  permissions: Permissions;
}

export function TaskDetailDialog({ task, isOpen, onOpenChange, currentUserProfile, permissions }: TaskDetailDialogProps) {
  const firestore = useFirestore();
  const [subTasks, setSubTasks] = useState<SubTask[]>(task.subTasks || []);
  const [newSubTask, setNewSubTask] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleSubTaskToggle = (subTaskId: string) => {
    const updatedSubTasks = subTasks.map(st => 
        st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    setSubTasks(updatedSubTasks);
    const taskRef = doc(firestore, 'tasks', task.id);
    updateDocumentNonBlocking(taskRef, { subTasks: updatedSubTasks });
  };

  const handleAddSubTask = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      if (!newSubTask.trim()) return;
      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const newSubTaskItem: SubTask = { id: newId, text: newSubTask, completed: false };
      const updatedSubTasks = [...subTasks, newSubTaskItem];
      setSubTasks(updatedSubTasks);
      setNewSubTask('');
      const taskRef = doc(firestore, 'tasks', task.id);
      updateDocumentNonBlocking(taskRef, { subTasks: updatedSubTasks });
  };
  
  const handleDeleteTask = (e: React.MouseEvent) => {
    e.preventDefault();
    const taskRef = doc(firestore, 'tasks', task.id);
    deleteDocumentNonBlocking(taskRef);
    setShowDeleteConfirm(false); // close confirmation
    onOpenChange(false); // Close the main dialog
  }

  const handleAddComment = (commentText: string) => {
    if (!firestore || !currentUserProfile) return;
    
    const commentEntry: ActivityEntry = {
        type: 'COMMENT',
        actorId: currentUserProfile.id,
        actorName: currentUserProfile.fullName,
        timestamp: new Date().toISOString(),
        text: commentText,
    };
    
    const taskRef = doc(firestore, 'tasks', task.id);
    updateDocumentNonBlocking(taskRef, {
        activity: arrayUnion(commentEntry),
    });
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
             <DialogTitle className='max-w-md'>{task.title}</DialogTitle>
             <TaskPriorityBadge priority={task.priority} />
          </div>
           <DialogDescription asChild>
             <div className="flex items-center gap-4 pt-1 text-sm text-muted-foreground">
                <Badge variant="secondary">{task.status.replace('_', ' ')}</Badge>
                <span>
                Assigned to {task.assignedToName}
                </span>
             </div>
           </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 py-4 flex-1 overflow-hidden">
          <div className="md:col-span-2 space-y-6 flex flex-col">
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Info className="h-4 w-4" /> Details
              </h4>
              <p className="text-foreground text-sm">{task.description || "No description provided."}</p>
            </div>
            
            <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <CheckSquare className="h-4 w-4" /> Checklist
                </h4>
                <div className="space-y-2 rounded-md border p-3">
                    {subTasks.map(st => (
                        <div key={st.id} className="flex items-center gap-3">
                            <Checkbox 
                                id={`subtask-${st.id}`} 
                                checked={st.completed}
                                onCheckedChange={() => handleSubTaskToggle(st.id)}
                            />
                            <label htmlFor={`subtask-${st.id}`} className={cn("text-sm flex-1", st.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
                                {st.text}
                            </label>
                        </div>
                    ))}
                    {subTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No checklist items yet.</p>}
                     <div className="flex items-center gap-2 pt-2 border-t">
                        <Input 
                            placeholder="Add a checklist item..."
                            value={newSubTask}
                            onChange={(e) => setNewSubTask(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubTask(e) }}
                            className="h-9"
                        />
                        <Button size="icon" variant="ghost" onClick={handleAddSubTask}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <History className="h-4 w-4" /> Activity Feed
              </h4>
              <div className="flex-1 rounded-md border p-4">
                  <ActivityFeed
                    activity={task.activity}
                    currentUserProfile={currentUserProfile}
                    onAddComment={handleAddComment}
                    isLoading={isSubmitting}
                  />
              </div>
            </div>
          </div>
          <div className="md:col-span-1 space-y-4 rounded-lg border bg-secondary/30 p-4 h-fit">
            <div className="flex items-start justify-between">
              <h4 className="font-semibold">Mission Brief</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> Assignee
                </span>
                <span className="font-medium">{task.assignedToName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Due Date
                </span>
                <span className="font-medium">
                  {task.dueDate ? format(new Date(task.dueDate), 'PP') : 'N/A'}
                </span>
              </div>
               {task.workbookId && (
                 <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <BookOpenCheck className="h-4 w-4" /> Workbook
                    </span>
                    <Link href={`/workbook/${task.workbookId}`} onClick={() => onOpenChange(false)} className='font-medium text-primary hover:underline truncate max-w-[100px]'>
                        View Sheet
                    </Link>
                  </div>
               )}
            </div>
          </div>
        </div>

        <DialogFooter>
             <div className='flex justify-start w-full items-center'>
                <div className='flex gap-2'>
                    {permissions.canManageStaff && (
                        <>
                            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the mission "{task.title}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive hover:bg-destructive/90" 
                                            onClick={handleDeleteTask}
                                        >
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                        </>
                    )}
                    {(permissions.canManageStaff || task.assignedTo === currentUserProfile.id) && (
                        <Button variant="outline" onClick={() => setShowShareDialog(true)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    )}
                </div>
            </div>
        </DialogFooter>
        
        {showEditDialog && (
            <EditTaskDialog
                task={task}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                currentUserProfile={currentUserProfile}
            />
        )}

        {showShareDialog && (
            <ShareTaskDialog
                task={task}
                open={showShareDialog}
                onOpenChange={setShowShareDialog}
                currentUserProfile={currentUserProfile}
            />
        )}

      </DialogContent>
    </Dialog>
  );
}
