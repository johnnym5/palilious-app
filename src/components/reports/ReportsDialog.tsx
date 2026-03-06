'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReportsPageContent } from './ReportsPageContent';


interface ReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportsDialog({ open, onOpenChange }: ReportsDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <ScrollArea className="h-full">
            <div className="p-6">
                <ReportsPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
