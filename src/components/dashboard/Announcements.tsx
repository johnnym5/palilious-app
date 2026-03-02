'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Megaphone, Pin, PlusCircle, Eye } from "lucide-react";
import { useUser, useDoc, useMemoFirebase, useCollection, useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { UserProfile, Announcement } from "@/lib/types";
import { collection, doc, query, where, orderBy, arrayUnion } from "firebase/firestore";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "../ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useEffect } from "react";

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

    useEffect(() => {
        if (sortedAnnouncements && authUser && firestore) {
            sortedAnnouncements.forEach(ann => {
                if (ann.isPinned && !ann.viewedBy?.includes(authUser.uid)) {
                    const annRef = doc(firestore, 'announcements', ann.id);
                    updateDocumentNonBlocking(annRef, {
                        viewedBy: arrayUnion(authUser.uid)
                    });
                }
            });
        }
    }, [sortedAnnouncements, authUser, firestore]);

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
                <div className="flow-root">
                    <ul role="list" className="-my-6 divide-y divide-border">
                        {isLoading && Array.from({length: 2}).map((_, i) => (
                            <li key={i} className="py-6">
                                <div className="flex gap-3">
                                    <Skeleton className="h-5 w-5 mt-1 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            </li>
                        ))}
                        {!isLoading && sortedAnnouncements.length === 0 && (
                            <li className="py-6">
                                <p className="text-sm text-muted-foreground text-center py-8">No announcements have been posted yet.</p>
                            </li>
                        )}
                        {!isLoading && sortedAnnouncements.map(announcement => (
                            <li key={announcement.id} className="py-6">
                                <div className="flex items-start gap-4">
                                    <Megaphone className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-sm">{announcement.title}</p>
                                            {announcement.isPinned && <Pin className="h-4 w-4 text-primary" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{announcement.content}</p>
                                        <div className="text-xs text-muted-foreground/70 mt-2 flex items-center justify-between">
                                            <span>
                                                {announcement.authorName} - {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                                            </span>
                                            {announcement.isPinned && permissions.canManageStaff && (
                                                <span className="flex items-center gap-1 text-primary/80">
                                                    <Eye className="h-3 w-3" />
                                                    {announcement.viewedBy?.length || 0}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
