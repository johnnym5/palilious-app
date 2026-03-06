'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChatPageContent } from './ChatPageContent';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatDialog({ open, onOpenChange }: ChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Chat</DialogTitle>
            <DialogDescription>Create channels or chat privately with team members.</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <div className="flex-1">
            <ChatPageContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
