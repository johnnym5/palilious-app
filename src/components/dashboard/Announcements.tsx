'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Pin, PinOff, PlusCircle } from "lucide-react";
import { Badge } from "../ui/badge";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, orderBy, query } from "firebase/firestore";
import type { Announcement, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";

export function Announcements() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userProfile } = useDoc<UserProfile>(userProfileQuery);

    const announcementsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    const canManage = userProfile?.role === 'HR' || userProfile?.role === 'MD';

    const sortedAnnouncements = announcements ? [...announcements].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)) : [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Announcements</CardTitle>
                {canManage && (
                    <Button variant="ghost" size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading && Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-4">
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                    ))}
                    {sortedAnnouncements.map((announcement) => (
                        <div key={announcement.id} className="flex items-start gap-4">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  {announcement.isPinned && <Badge variant="secondary" className="border-primary/50 text-primary">Pinned</Badge>}
                                  <p className="text-sm font-medium leading-none">{announcement.title}</p>
                                </div>
                                <p className="text-sm text-muted-foreground">{announcement.content}</p>
                            </div>
                            {canManage && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    {announcement.isPinned ? <PinOff className="h-4 w-4 text-muted-foreground" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
                                </Button>
                            )}
                        </div>
                    ))}
                    {!isLoading && announcements?.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center">No announcements yet.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
