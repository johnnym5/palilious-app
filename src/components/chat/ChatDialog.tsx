
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserProfile, Chat, ChatMessage } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2, PlusCircle, Hash, MessageSquare } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn, sanitizeInput } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CreateChannelDialog } from './CreateChannelDialog';
import { Separator } from '../ui/separator';

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
  initialPayload?: { initialUserId?: string };
}

function ChatMessages({ chat, currentUserProfile }: { chat: Chat, currentUserProfile: UserProfile }) {
    const firestore = useFirestore();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemoFirebase(() => 
        query(collection(firestore, 'chats', chat.id, 'messages'), orderBy('timestamp', 'asc'))
    , [firestore, chat.id]);
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

export function ChatDialog({ open, onOpenChange, currentUserProfile, initialPayload }: ChatDialogProps) {
  const firestore = useFirestore();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  const chatsQuery = useMemoFirebase(() => 
    query(collection(firestore, 'chats'), where('participants', 'array-contains', currentUserProfile.id), orderBy('updatedAt', 'desc'))
  , [firestore, currentUserProfile.id]);
  const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);

  const { channels, directMessages } = useMemo(() => {
    if (!chats) return { channels: [], directMessages: [] };
    const ch: Chat[] = [];
    const dm: Chat[] = [];
    chats.forEach(c => c.type === 'CHANNEL' ? ch.push(c) : dm.push(c));
    return { channels: ch, directMessages: dm };
  }, [chats]);
  
  useEffect(() => {
    if (open && initialPayload?.initialUserId) {
        const userId = initialPayload.initialUserId;
        const dmId = [currentUserProfile.id, userId].sort().join('_');
        
        const existingDM = directMessages.find(dm => dm.id === dmId);
        if (existingDM) {
            setSelectedChat(existingDM);
        } else {
            // Find the user profile to create a temporary chat object
            const otherUser = directMessages.flatMap(dm => dm.participants)
                .map(pId => chats?.find(c => c.participantProfiles[pId])?.participantProfiles[pId])
                .find(p => p && p.fullName) // Simplistic way to find user data, better to query users collection
            
            // This is a temporary object. The doc is created on first message.
            setSelectedChat({
                id: dmId,
                orgId: currentUserProfile.orgId,
                type: 'DIRECT',
                participants: [currentUserProfile.id, userId],
                participantProfiles: {
                    [currentUserProfile.id]: { fullName: currentUserProfile.fullName },
                    [userId]: { fullName: "Loading..." } // Will be filled on first message
                },
                updatedAt: new Date().toISOString()
            });
        }
    }
  }, [open, initialPayload, directMessages, currentUserProfile]);

  const handleSendMessage = async () => {
    if (!selectedChat || !message.trim() || !firestore) return;
    setIsSending(true);

    const now = new Date().toISOString();

    const chatRef = doc(firestore, 'chats', selectedChat.id);
    const messageRef = collection(firestore, 'chats', selectedChat.id, 'messages');

    const messageData: Omit<ChatMessage, 'id'> = {
        chatId: selectedChat.id,
        orgId: currentUserProfile.orgId,
        senderId: currentUserProfile.id,
        senderName: currentUserProfile.fullName,
        content: sanitizeInput(message),
        timestamp: now,
    };
    
    try {
        await addDocumentNonBlocking(messageRef, messageData);
        
        // Update last message on chat doc
        const chatUpdateData = {
            lastMessage: {
                text: messageData.content,
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                timestamp: now,
            },
            updatedAt: now,
            // If it was a temporary chat, fill in the full details
            ...(!selectedChat.lastMessage && { 
              participants: selectedChat.participants,
              participantProfiles: selectedChat.participantProfiles,
              orgId: selectedChat.orgId,
              type: selectedChat.type,
            })
        }
        await setDocumentNonBlocking(chatRef, chatUpdateData, { merge: true });

        setMessage('');
    } catch(e) {
        console.error("Failed to send message: ", e);
    } finally {
        setIsSending(false);
    }
  }
  
  const getDirectMessageTitle = (chat: Chat) => {
    const otherParticipantId = chat.participants.find(p => p !== currentUserProfile.id);
    if (!otherParticipantId) return "Unknown User";
    return chat.participantProfiles[otherParticipantId]?.fullName || "Unknown User";
  }


  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Internal Chat</DialogTitle>
          <DialogDescription>
            Communicate with your team via channels and direct messages.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 grid grid-cols-3 overflow-hidden">
            <div className="col-span-1 border-r flex flex-col">
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between px-2">
                             <h4 className="font-semibold text-sm">Channels</h4>
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsCreateChannelOpen(true)}><PlusCircle className="h-4 w-4" /></Button>
                           </div>
                           {isLoading && Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                           {channels.map(chat => (
                               <div key={chat.id} onClick={() => setSelectedChat(chat)} className={cn("p-2 rounded-lg cursor-pointer hover:bg-secondary", selectedChat?.id === chat.id && "bg-secondary")}>
                                   <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground"/> <p className="font-semibold truncate">{chat.name}</p></div>
                                   <p className="text-xs text-muted-foreground truncate">{chat.lastMessage?.text}</p>
                               </div>
                           ))}
                        </div>
                        <Separator />
                        <div className="space-y-2">
                           <h4 className="font-semibold text-sm px-2">Direct Messages</h4>
                           {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                           {directMessages.map(chat => (
                               <div key={chat.id} onClick={() => setSelectedChat(chat)} className={cn("p-2 rounded-lg cursor-pointer hover:bg-secondary", selectedChat?.id === chat.id && "bg-secondary")}>
                                   <div className="flex items-center gap-2">
                                       <Avatar className="h-8 w-8"><AvatarFallback>{getDirectMessageTitle(chat).split(' ').map(n=>n[0]).join('')}</AvatarFallback></Avatar>
                                       <div>
                                            <p className="font-semibold truncate">{getDirectMessageTitle(chat)}</p>
                                            <p className="text-xs text-muted-foreground truncate">{chat.lastMessage?.text}</p>
                                       </div>
                                   </div>
                               </div>
                           ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>
            <div className="col-span-2 flex flex-col">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold">
                                {selectedChat.type === 'CHANNEL' ? `# ${selectedChat.name}` : getDirectMessageTitle(selectedChat)}
                            </h3>
                        </div>
                        <ChatMessages chat={selectedChat} currentUserProfile={currentUserProfile} />
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
                        <p>Select a conversation to begin.</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <CreateChannelDialog 
        open={isCreateChannelOpen} 
        onOpenChange={setIsCreateChannelOpen} 
        currentUserProfile={currentUserProfile}
    />
    </>
  );
}
