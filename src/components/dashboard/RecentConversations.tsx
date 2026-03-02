'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Chat, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

export function RecentConversations() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const chatsQuery = useMemoFirebase(() => {
        if (!authUser) return null;
        return query(
            collection(firestore, 'chats'),
            where('participants', 'array-contains', authUser.uid),
            orderBy('updatedAt', 'desc'),
            limit(4)
        );
    }, [firestore, authUser]);

    const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);

    const getOtherParticipant = (chat: Chat) => {
        if (!authUser) return { fullName: 'Unknown User', avatarURL: '' };
        const otherId = chat.participants.find(p => p !== authUser.uid);
        if (!otherId || !chat.participantProfiles[otherId]) {
            return { fullName: 'Unknown User', avatarURL: '' };
        }
        return chat.participantProfiles[otherId];
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Messages</CardTitle>
                    <CardDescription>Your latest conversations.</CardDescription>
                </div>
                 <Link href="/chat" passHref>
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="ml-2 h-4 w-4"/>
                  </Button>
                </Link>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                     {isLoading && Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                     ))}
                     {!isLoading && chats?.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-10">
                            <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                            No recent messages.
                        </div>
                     )}
                     {!isLoading && chats?.map(chat => {
                        const otherParticipant = getOtherParticipant(chat);
                        return (
                            <Link key={chat.id} href="/chat" className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-secondary/50 transition-colors">
                                <Avatar>
                                    <AvatarImage src={otherParticipant.avatarURL} />
                                    <AvatarFallback>{otherParticipant.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 truncate">
                                    <p className="font-semibold text-sm">{otherParticipant.fullName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{chat.lastMessage?.text}</p>
                                </div>
                                {chat.lastMessage && (
                                    <p className="text-xs text-muted-foreground self-start">{formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}</p>
                                )}
                            </Link>
                        )
                     })}
                </div>
            </CardContent>
        </Card>
    );
}
