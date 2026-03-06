'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AttendancePageContent } from './AttendancePageContent';


interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceDialog({ open, onOpenChange }: AttendanceDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <ScrollArea className="h-full">
            <div className="p-6">
                <AttendancePageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
