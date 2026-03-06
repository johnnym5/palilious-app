'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeavePageContent } from './LeavePageContent';

interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveDialog({ open, onOpenChange }: LeaveDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <ScrollArea className="h-full">
            <div className="p-6">
                <LeavePageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
