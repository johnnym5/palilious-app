'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RequisitionsPageContent } from './RequisitionsPageContent';


interface RequisitionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequisitionsDialog({ open, onOpenChange }: RequisitionsDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <ScrollArea className="h-full">
            <div className="p-6">
                <RequisitionsPageContent />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
