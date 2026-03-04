'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { UserProfile, Chat, ChatMessage, ChatType } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Send, MessagesSquare, Hash } from 'lucide-react';
import { useCollection, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
    currentUserProfile: UserProfile | null;
    selectedChat: Chat | null;
}

// Function to create a consistent chat ID between two users
const getChatId = (uid1: string, uid2: string) => {
    return uid1 > uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};


export function ChatWindow({ currentUserProfile, selectedChat }: ChatWindowProps) {
    const firestore = useFirestore();
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const chatId = useMemo(() => {
        if (!currentUserProfile || !selectedChat) return null;
        if (selectedChat.type === 'DIRECT') {
            return getChatId(selectedChat.participants[0], selectedChat.participants[1]);
        }
        // For channels, the ID is already set if it's an existing chat
        return selectedChat.id || null;
    }, [currentUserProfile, selectedChat]);

    const messagesQuery = useMemoFirebase(() => {
        if (!chatId) return null;
        return query(
            collection(firestore, `chats/${chatId}/messages`),
            orderBy('timestamp', 'asc')
        );
    }, [firestore, chatId]);

    const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);
    
    // Effect to scroll to bottom when new messages arrive
    useEffect(() => {
        setTimeout(() => {
            if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
            }
        }, 100)
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserProfile || !selectedChat) return;

        // Determine the correct chat ID, creating one if it's a new DM
        const finalChatId = selectedChat.id || (selectedChat.type === 'DIRECT' ? getChatId(selectedChat.participants[0], selectedChat.participants[1]) : null);
        if (!finalChatId) return;

        setIsSending(true);

        const timestamp = new Date().toISOString();

        // Prepare message data
        const messageData: Omit<ChatMessage, 'id'> = {
            chatId: finalChatId,
            orgId: currentUserProfile.orgId,
            senderId: currentUserProfile.id,
            senderName: currentUserProfile.fullName,
            content: newMessage,
            timestamp,
        };
        
        // Prepare chat metadata update
        const chatData = {
            ...selectedChat, // carry over name, type etc.
            id: finalChatId, // ensure id is set
            orgId: currentUserProfile.orgId,
            lastMessage: {
                text: newMessage,
                senderId: currentUserProfile.id,
                senderName: currentUserProfile.fullName,
                timestamp,
            },
            updatedAt: timestamp,
        };

        // Get references
        const messagesColRef = collection(firestore, `chats/${finalChatId}/messages`);
        const chatDocRef = doc(firestore, `chats/${finalChatId}`);

        try {
            await addDocumentNonBlocking(messagesColRef, messageData);
            setDocumentNonBlocking(chatDocRef, chatData, { merge: true });
            
            setNewMessage("");
        } catch (error) {
             console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };

    if (!selectedChat || !currentUserProfile) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                 <MessagesSquare className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-semibold text-foreground">Select a conversation</h3>
                <p>Choose a person or channel from the sidebar to start chatting.</p>
            </div>
        );
    }

    const isChannel = selectedChat.type === 'CHANNEL';
    const otherParticipant = !isChannel ? selectedChat.participantProfiles[selectedChat.participants.find(p => p !== currentUserProfile.id) || ''] : null;

    const getSenderProfile = (senderId: string) => {
        return selectedChat.participantProfiles[senderId] || { fullName: 'Unknown User' };
    }
    
    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center gap-4">
                 {isChannel ? (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Hash className="h-5 w-5 text-muted-foreground" />
                    </div>
                 ) : (
                    <Avatar className="h-10 w-10">
                        
                        <AvatarFallback>{otherParticipant?.fullName?.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                 )}
                <div>
                    <p className="font-semibold text-foreground">{isChannel ? selectedChat.name : otherParticipant?.fullName}</p>
                    <p className="text-sm text-muted-foreground">{isChannel ? `${selectedChat.participants.length} members` : 'Direct Message'}</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6" ref={scrollAreaRef}>
                 <div className="space-y-6">
                    {isLoading && <Loader2 className="mx-auto animate-spin" />}
                    {!isLoading && messages?.map((message, index) => {
                        const sender = getSenderProfile(message.senderId);
                        const showSenderName = isChannel && (index === 0 || messages[index-1].senderId !== message.senderId);
                        return (
                        <div key={message.id} className={cn(
                            "flex items-end gap-3 max-w-lg",
                            message.senderId === currentUserProfile.id ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}>
                             <Avatar className="h-8 w-8">
                                
                                <AvatarFallback>{sender.fullName.split(" ").map(n=>n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className={cn(
                                "p-3 rounded-xl max-w-md",
                                message.senderId === currentUserProfile.id ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary rounded-bl-none"
                            )}>
                                {showSenderName && (
                                     <p className="text-xs font-semibold pb-1">{sender.fullName}</p>
                                )}
                                <p className="text-sm break-words">{message.content}</p>
                                 <p className={cn(
                                    "text-xs mt-1 opacity-70 text-right",
                                    message.senderId === currentUserProfile.id ? 'text-primary-foreground' : 'text-muted-foreground'
                                 )}>
                                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                                 </p>
                            </div>
                        </div>
                    )})}
                    {!isLoading && messages?.length === 0 && (
                        <div className="text-center text-muted-foreground py-16">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    )}
                 </div>
            </div>


            {/* Input */}
            <div className="p-4 border-t bg-background/50">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${isChannel ? selectedChat.name : otherParticipant?.fullName}`} 
                        autoComplete="off"
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
