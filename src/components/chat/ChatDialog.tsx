
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserProfile, Chat, ChatMessage } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn, sanitizeInput } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
}

function ChatMessages({ chatId, currentUserProfile }: { chatId: string, currentUserProfile: UserProfile }) {
    const firestore = useFirestore();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemoFirebase(() => 
        query(collection(firestore, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'))
    , [firestore, chatId]);
    const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    if (isLoading) {
        return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
    }

    if (!messages || messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
            </div>
        )
    }

    return (
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
                {messages.map(message => {
                    const isCurrentUser = message.senderId === currentUserProfile.id;
                    return (
                        <div key={message.id} className={cn("flex items-end gap-2", isCurrentUser ? "justify-end" : "justify-start")}>
                             {!isCurrentUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{message.senderName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "max-w-xs md:max-w-md rounded-lg px-3 py-2 text-sm", 
                                isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary"
                            )}>
                                <p>{message.content}</p>
                                <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                                </p>
                            </div>
                            {isCurrentUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{currentUserProfile.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    )
                })}
            </div>
        </ScrollArea>
    )
}

export function ChatDialog({ open, onOpenChange, currentUserProfile }: ChatDialogProps) {
  const firestore = useFirestore();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const usersQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile.orgId]);
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  const chatId = useMemo(() => {
    if (!selectedUser) return null;
    return [currentUserProfile.id, selectedUser.id].sort().join('_');
  }, [selectedUser, currentUserProfile.id]);


  const handleSendMessage = async () => {
    if (!chatId || !selectedUser || !message.trim() || !firestore) return;
    setIsSending(true);

    const now = new Date().toISOString();

    const chatRef = doc(firestore, 'chats', chatId);
    const messageRef = collection(firestore, 'chats', chatId, 'messages');

    const messageData: Omit<ChatMessage, 'id'> = {
        chatId: chatId,
        orgId: currentUserProfile.orgId,
        senderId: currentUserProfile.id,
        senderName: currentUserProfile.fullName,
        content: sanitizeInput(message),
        timestamp: now,
    };
    
    try {
        await addDocumentNonBlocking(messageRef, messageData);

        const chatData: Chat = {
            id: chatId,
            orgId: currentUserProfile.orgId,
            type: 'DIRECT',
            participants: [currentUserProfile.id, selectedUser.id],
            participantProfiles: {
                [currentUserProfile.id]: { fullName: currentUserProfile.fullName },
                [selectedUser.id]: { fullName: selectedUser.fullName },
            },
            lastMessage: {
                text: messageData.content,
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                timestamp: now,
            },
            updatedAt: now,
        }
        await setDocumentNonBlocking(chatRef, chatData, { merge: true });

        setMessage('');
    } catch(e) {
        console.error("Failed to send message: ", e);
    } finally {
        setIsSending(false);
    }
  }


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
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-secondary",
                                    selectedUser?.id === user.id && "bg-secondary"
                                )}
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
                {selectedUser && chatId ? (
                    <>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold">Chat with {selectedUser.fullName}</h3>
                        </div>
                        <ChatMessages chatId={chatId} currentUserProfile={currentUserProfile} />
                        <div className="p-4 border-t flex items-center gap-2">
                            <Input 
                                placeholder="Type your message..." 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isSending) {
                                        handleSendMessage();
                                    }
                                }}
                                disabled={isSending}
                            />
                            <Button onClick={handleSendMessage} disabled={isSending || !message.trim()}>
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
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
