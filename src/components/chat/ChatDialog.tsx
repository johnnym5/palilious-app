'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChatPageContent } from './ChatPageContent';

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatDialog({ open, onOpenChange }: ChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <ChatPageContent />
      </DialogContent>
    </Dialog>
  );
}
