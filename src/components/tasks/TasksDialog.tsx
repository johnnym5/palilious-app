'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TasksPageContent } from './TasksPageContent';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';


interface TasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TasksDialog({ open, onOpenChange }: TasksDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <VisuallyHidden>
            <DialogHeader>
                <DialogTitle>Task Manager</DialogTitle>
                <DialogDescription>View and manage tasks.</DialogDescription>
            </DialogHeader>
        </VisuallyHidden>
        <ScrollArea className="flex-1">
            <div className="p-6">
                <TasksPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
