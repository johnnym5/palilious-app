'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Task, UserProfile, TaskUpdate, SubTask } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar, CheckSquare, Clock, HardDriveDownload, History, Info, Link as LinkIcon, User, Zap, Target, Plus } from 'lucide-react';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { useState } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUserProfile: UserProfile;
  permissions: Permissions;
}

const statusIcons: Record<TaskUpdate['status'], React.ElementType> = {
    CREATED: CheckSquare,
    UPDATED: CheckSquare,
    QUEUED: Clock,
    ACTIVE: Clock,
    AWAITING_REVIEW: History,
    ARCHIVED: HardDriveDownload,
};

export function TaskDetailDialog({ task, isOpen, onOpenChange, currentUserProfile, permissions }: TaskDetailDialogProps) {
  const firestore = useFirestore();
  const [subTasks, setSubTasks] = useState<SubTask[]>(task.subTasks || []);
  const [newSubTask, setNewSubTask] = useState('');

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


  const getStatusText = (entry: TaskUpdate) => {
    switch (entry.status) {
        case 'CREATED': return `created the mission.`;
        case 'QUEUED': return `queued the mission.`;
        case 'ACTIVE': return `started the mission.`;
        case 'AWAITING_REVIEW': return `submitted for review.`;
        case 'ARCHIVED': return `approved and archived the mission.`;
        default: return `updated the mission.`;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
             <DialogTitle className='max-w-md'>{task.title}</DialogTitle>
             <TaskPriorityBadge priority={task.priority} />
          </div>
          <DialogDescription className="flex items-center gap-4 pt-1">
            <Badge variant="secondary">{task.status.replace('_', ' ')}</Badge>
            <span>
              Assigned to {task.assignedToName}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 py-4">
          <div className="md:col-span-2 space-y-6">
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
                </div>
                 <div className="flex items-center gap-2">
                    <Input 
                        placeholder="Add a checklist item..."
                        value={newSubTask}
                        onChange={(e) => setNewSubTask(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubTask(e) }}
                        className="h-9"
                    />
                    <Button size="sm" onClick={handleAddSubTask}>
                        <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <History className="h-4 w-4" /> Mission Log
              </h4>
              <ScrollArea className="h-40 rounded-md border">
                <div className="p-3 space-y-4">
                  {task.updates.slice().reverse().map((entry, index) => {
                      const Icon = statusIcons[entry.status];
                      const isLast = index === task.updates.length - 1;
                      return (
                        <div key={index} className="flex items-start gap-3 relative">
                           {!isLast && <div className="absolute left-[15px] top-[14px] h-full w-px bg-border -z-10" />}
                           <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                           </div>
                           <div className='pt-1'>
                             <p className="text-sm font-medium">
                               <span className="text-muted-foreground">
                                 Update from {formatDistanceToNow(new Date(entry.time), { addSuffix: true })}
                               </span>
                             </p>
                             {entry.note && (
                                <div className="text-sm text-foreground mt-1 border-l-2 pl-3 py-1 bg-background/50 rounded-r-md">
                                   <p className="font-semibold">Completion Brief:</p>
                                   <blockquote className='italic'>{entry.note}</blockquote>
                                </div>
                             )}
                           </div>
                        </div>
                      )
                    })}
                </div>
              </ScrollArea>
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
               {task.attachmentUrl && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <LinkIcon className="h-4 w-4" /> Document
                    </span>
                    <Link href={task.attachmentUrl} target="_blank" rel="noopener noreferrer" className='font-medium text-primary hover:underline truncate max-w-[100px]'>
                        View File
                    </Link>
                  </div>
               )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
