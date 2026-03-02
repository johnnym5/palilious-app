'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Megaphone, Pin, PlusCircle } from "lucide-react";
import { useUser, useDoc, useMemoFirebase, useCollection, useFirestore } from "@/firebase";
import { UserProfile, Announcement } from "@/lib/types";
import { collection, doc, query, where, orderBy } from "firebase/firestore";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "../ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

export function Announcements() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    
    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, "users", authUser.uid) : null,
    [firestore, authUser]);
    
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const announcementsQuery = useMemoFirebase(() => {
        if (!userProfile) return null;
        return query(
            collection(firestore, 'announcements'),
            where('orgId', '==', userProfile.orgId),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, userProfile]);

    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    const sortedAnnouncements = useMemo(() => {
        if (!announcements) return [];
        return [...announcements].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [announcements]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Announcements</CardTitle>
                {permissions.canManageStaff && (
                    <Button variant="ghost" size="sm" disabled>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading && Array.from({length: 2}).map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="h-5 w-5 mt-1" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                    {!isLoading && sortedAnnouncements.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center">No announcements have been posted yet.</p>
                    )}
                    {!isLoading && sortedAnnouncements.map(announcement => (
                        <div key={announcement.id} className="flex items-start gap-3">
                            <Megaphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-sm">{announcement.title}</p>
                                    {announcement.isPinned && <Pin className="h-4 w-4 text-primary" />}
                                </div>
                                <p className="text-sm text-muted-foreground">{announcement.content}</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    {announcement.authorName} - {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
