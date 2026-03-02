'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Task, UserProfile, TaskUpdate } from '@/lib/types';
import type { Permissions } from '@/hooks/usePermissions';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar, CheckSquare, Clock, HardDriveDownload, History, Info, Link as LinkIcon, User, Zap, Target } from 'lucide-react';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Badge } from '../ui/badge';
import Link from 'next/link';

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
      <DialogContent className="max-w-2xl">
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

        <div className="grid grid-cols-3 gap-6 py-4">
          <div className="col-span-2 space-y-6">
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Info className="h-4 w-4" /> Details
              </h4>
              <p className="text-foreground text-sm">{task.description || "No description provided."}</p>
            </div>

            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <History className="h-4 w-4" /> Mission Log
              </h4>
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-3 space-y-4">
                  {task.updates.slice().reverse().map((entry, index) => {
                      const Icon = statusIcons[entry.status];
                      return (
                        <div key={index} className="flex items-start gap-3 relative">
                           <div className="absolute left-[15px] top-[14px] h-full w-px bg-border -z-10" />
                           <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                           </div>
                           <div className='pt-1'>
                             <p className="text-sm font-medium">
                               <span className="text-muted-foreground">
                                 Update from {formatDistanceToNow(new Date(entry.time), { addSuffix: true })}
                               </span>
                             </p>
                             {entry.note && (
                                <div className="text-sm text-foreground mt-1 border-l-2 pl-3">
                                   <p className="font-semibold">Completion Brief:</p>
                                   <p>{entry.note}</p>
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
          <div className="col-span-1 space-y-4 rounded-lg border bg-secondary/30 p-4">
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
                  {format(new Date(task.dueDate), 'PP')}
                </span>
              </div>
               {task.attachmentUrl && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <LinkIcon className="h-4 w-4" /> Attachment
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
