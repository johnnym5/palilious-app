'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { UserProfile, Chat } from '@/lib/types';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '../ui/separator';
import { Hash, User } from 'lucide-react';

interface ChatSidebarProps {
    currentUserProfile: UserProfile | null;
    onSelectConversation: (item: Chat | UserProfile) => void;
    selectedChatId?: string | null;
}

export function ChatSidebar({ currentUserProfile, onSelectConversation, selectedChatId }: ChatSidebarProps) {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const chatsQuery = useMemoFirebase(() => 
        currentUserProfile ? query(
            collection(firestore, 'chats'),
            where('participants', 'array-contains', currentUserProfile.id),
            orderBy('updatedAt', 'desc')
        ) : null,
    [firestore, currentUserProfile]);
    const { data: chats, isLoading: isLoadingChats } = useCollection<Chat>(chatsQuery);

    const allUsersQuery = useMemoFirebase(() => 
        currentUserProfile ? query(
            collection(firestore, 'users'),
            where('orgId', '==', currentUserProfile.orgId)
        ) : null,
    [firestore, currentUserProfile]);
    const { data: allUsers, isLoading: isLoadingUsers } = useCollection<UserProfile>(allUsersQuery);

    const searchResults = useMemo(() => {
        if (!searchTerm || !allUsers) return [];
        return allUsers.filter(user => 
            user.id !== currentUserProfile?.id &&
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, allUsers, currentUserProfile]);

    const { channels, directMessages } = useMemo(() => {
        if (!chats) return { channels: [], directMessages: [] };
        return {
            channels: chats.filter(c => c.type === 'CHANNEL'),
            directMessages: chats.filter(c => c.type === 'DIRECT'),
        };
    }, [chats]);

    const isSearching = searchTerm.length > 0;
    const isLoading = isLoadingChats || isLoadingUsers;

    const getOtherParticipant = (chat: Chat) => {
        if (!currentUserProfile) return { id: '', fullName: 'Unknown' };
        const otherId = chat.participants.find(p => p !== currentUserProfile.id) || '';
        const profile = allUsers?.find(u => u.id === otherId)
        if (!profile) {
            return { id: '', fullName: 'Unknown User' };
        }
        return profile;
    }

    return (
        <div className="w-[300px] border-r flex flex-col bg-background/50">
            <div className="p-2 border-b">
                <Input 
                    placeholder="Search or start new chat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isLoading && Array.from({ length: 7 }).map((_, i) => (
                         <div key={i} className="flex items-center gap-3 p-2">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    ))}
                    {!isLoading && isSearching && searchResults.map(user => {
                         return (
                        <button
                            key={user.id}
                            onClick={() => onSelectConversation(user)}
                            className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors hover:bg-secondary/50",
                            )}
                        >
                            <Avatar className="h-10 w-10">
                                <AvatarFallback>{user.fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 truncate">
                                <p className="font-medium text-sm text-foreground">{user.fullName}</p>
                                <p className="text-xs text-muted-foreground">{user.position}</p>
                            </div>
                        </button>
                    )})}
                    {!isLoading && !isSearching && (
                        <>
                            <div className="flex items-center px-2 pt-2 text-xs font-semibold text-muted-foreground uppercase">
                                <Hash className="h-4 w-4 mr-2" />
                                Channels
                            </div>
                            {channels.length === 0 ? (
                                <p className="p-2 text-center text-xs text-muted-foreground">No channels yet.</p>
                            ): channels.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => onSelectConversation(chat)}
                                    className={cn(
                                        "w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors",
                                        selectedChatId === chat.id ? "bg-secondary" : "hover:bg-secondary/50"
                                    )}
                                >
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <Hash className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 truncate">
                                        <p className="font-medium text-sm text-foreground">{chat.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{chat.lastMessage?.senderName}: {chat.lastMessage?.text}</p>
                                    </div>
                                </button>
                            ))}

                            <Separator className="my-2" />
                             <div className="flex items-center px-2 pt-2 text-xs font-semibold text-muted-foreground uppercase">
                                <User className="h-4 w-4 mr-2" />
                                Direct Messages
                            </div>
                            {directMessages.length === 0 ? (
                                 <p className="p-2 text-center text-xs text-muted-foreground">No direct messages yet.</p>
                            ) : directMessages.map(chat => {
                                const otherParticipant = getOtherParticipant(chat);
                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => onSelectConversation(chat)}
                                        className={cn(
                                            "w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors",
                                            selectedChatId === chat.id ? "bg-secondary" : "hover:bg-secondary/50"
                                        )}
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback>{otherParticipant.fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 truncate">
                                            <p className="font-medium text-sm text-foreground">{otherParticipant.fullName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{chat.lastMessage?.text}</p>
                                        </div>
                                        {chat.lastMessage?.timestamp && (
                                            <span className="text-xs text-muted-foreground pt-1">{formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}</span>
                                        )}
                                    </button>
                                )
                            })}
                        </>
                    )}
                     {!isLoading && (isSearching ? searchResults.length === 0 : chats?.length === 0) && (
                        <p className="p-4 text-center text-sm text-muted-foreground">
                            {isSearching ? 'No users found.' : 'No conversations. Start one!'}
                        </p>
                     )}
                </div>
            </ScrollArea>
        </div>
    );
}
