'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

interface ChatSidebarProps {
    currentUserProfile: UserProfile | null;
    onSelectUser: (user: UserProfile) => void;
    selectedUser: UserProfile | null;
}

export function ChatSidebar({ currentUserProfile, onSelectUser, selectedUser }: ChatSidebarProps) {
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => 
        currentUserProfile ? query(
            collection(firestore, 'users'),
            where('orgId', '==', currentUserProfile.orgId)
        ) : null,
    [firestore, currentUserProfile]);

    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

    const otherUsers = users?.filter(u => u.id !== currentUserProfile?.id)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    return (
        <div className="w-[300px] border-r flex flex-col bg-background/50">
            <div className="p-4 border-b">
                <h2 className="text-xl font-headline font-bold">Team</h2>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isLoading && Array.from({ length: 7 }).map((_, i) => (
                         <div key={i} className="flex items-center gap-3 p-2">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    ))}
                    {!isLoading && otherUsers?.map(user => (
                        <button
                            key={user.id}
                            onClick={() => onSelectUser(user)}
                            className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                                selectedUser?.id === user.id ? "bg-secondary" : "hover:bg-secondary/50"
                            )}
                        >
                            <Avatar className="relative h-10 w-10">
                                <AvatarImage src={user.avatarURL} alt={user.fullName} />
                                <AvatarFallback>{user.fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                                {user.status === 'ONLINE' && (
                                    <div className="absolute -bottom-0.5 -right-0.5 rounded-full h-3.5 w-3.5 bg-background p-0.5">
                                        <div className="h-full w-full rounded-full bg-emerald-500" />
                                    </div>
                                )}
                            </Avatar>
                            <div className="flex-1 truncate">
                                <p className="font-medium text-sm text-foreground">{user.fullName}</p>
                                <p className="text-xs text-muted-foreground">{user.position}</p>
                            </div>
                        </button>
                    ))}
                     {!isLoading && otherUsers?.length === 0 && (
                        <p className="p-4 text-center text-sm text-muted-foreground">No other users in your organization.</p>
                     )}
                </div>
            </ScrollArea>
        </div>
    );
}
