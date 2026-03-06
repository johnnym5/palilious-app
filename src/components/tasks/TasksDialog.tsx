'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TasksPageContent } from './TasksPageContent';


interface TasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TasksDialog({ open, onOpenChange }: TasksDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <ScrollArea className="h-full">
            <div className="p-6">
                <TasksPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
