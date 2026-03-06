"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserProfile } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
}

export function ChatDialog({ open, onOpenChange, currentUserProfile }: ChatDialogProps) {
  const firestore = useFirestore();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const usersQuery = useMemoFirebase(() => 
    query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId))
  , [firestore, currentUserProfile.orgId]);
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Internal Chat</DialogTitle>
          <DialogDescription>
            Communicate with your team members directly.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 grid grid-cols-3 overflow-hidden">
            <div className="col-span-1 border-r">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                        {isLoading && Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        {users?.filter(u => u.id !== currentUserProfile.id).map(user => (
                            <div 
                                key={user.id} 
                                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-secondary"
                                onClick={() => setSelectedUser(user)}
                            >
                                <Avatar>
                                    <AvatarFallback>{user.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{user.fullName}</p>
                                    <p className="text-sm text-muted-foreground">{user.position}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <div className="col-span-2 flex flex-col">
                {selectedUser ? (
                    <>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold">Chat with {selectedUser.fullName}</h3>
                        </div>
                        <div className="flex-1 p-4 text-center text-muted-foreground flex items-center justify-center">
                            <p>Messaging UI will be implemented here.</p>
                        </div>
                        <div className="p-4 border-t flex items-center gap-2">
                            <Input placeholder="Type your message..." />
                            <Button><Send className="h-4 w-4" /></Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <p>Select a user to start a conversation.</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
