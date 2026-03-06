'use client';
import { StatCard } from "@/components/dashboard/StatCard";
import { CheckCircle, MessageSquare, Megaphone } from "lucide-react";
import { ActiveTasks } from "@/components/dashboard/ActiveTasks";
import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile, Chat, Requisition } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { PerformanceCard } from "@/components/dashboard/PerformanceCard";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { Announcements } from "@/components/dashboard/Announcements";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { NewAnnouncementDialog } from "@/components/dashboard/NewAnnouncementDialog";

export default function DashboardPage() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const [isNewAnnouncementOpen, setIsNewAnnouncementOpen] = useState(false);

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null, 
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    // Fetch pending approvals for requisitions
    const reqsQuery = useMemoFirebase(() => {
        if (!userProfile) return null;
        const inboxStatuses: string[] = [];
        if (permissions.canApproveHR) inboxStatuses.push('PENDING_HR');
        if (permissions.canApproveFinance) inboxStatuses.push('PENDING_FINANCE');
        if (permissions.canApproveMD) inboxStatuses.push('PENDING_MD');
        if (permissions.canDisburse) inboxStatuses.push('APPROVED'); // Finance can also see approved to pay them
        
        if (inboxStatuses.length === 0) return null;
        
        return query(
            collection(firestore, 'requisitions'),
            where('orgId', '==', userProfile.orgId),
            where('status', 'in', [...new Set(inboxStatuses)])
        );
    }, [firestore, userProfile, permissions]);
    const { data: pendingReqs, isLoading: reqsLoading } = useCollection<Requisition>(reqsQuery);


    // Fetch unread messages
    const chatsQuery = useMemoFirebase(() => 
        authUser ? query(
            collection(firestore, 'chats'),
            where('participants', 'array-contains', authUser.uid)
        ) : null,
    [firestore, authUser]);
    const { data: chats, isLoading: chatsLoading } = useCollection<Chat>(chatsQuery);

    const unreadMessagesCount = useMemo(() => {
        // This is a simplified count. A real implementation would need to track read statuses per user.
        if (!chats || !authUser) return 0;
        return chats.filter(chat => chat.lastMessage && chat.lastMessage.senderId !== authUser.uid).length;
    }, [chats, authUser]);


    const isLoading = isProfileLoading || reqsLoading || chatsLoading;

    return (
        <div className="flex flex-col gap-8">
             {isLoading ? (
                <Skeleton className="h-40 w-full" />
             ) : (
                userProfile && <PerformanceCard userProfile={userProfile} />
             )}

            <ActiveTasks />
            
            <RecentConversations />

            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold font-headline">Recent Updates</h2>
                    {userProfile && permissions.canManageAnnouncements && (
                        <NewAnnouncementDialog 
                            open={isNewAnnouncementOpen}
                            onOpenChange={setIsNewAnnouncementOpen}
                            userProfile={userProfile}
                        >
                            <Button variant="outline" size="sm" onClick={() => setIsNewAnnouncementOpen(true)}>
                                <Megaphone className="mr-2 h-4 w-4"/>
                                New Announcement
                            </Button>
                        </NewAnnouncementDialog>
                    )}
                 </div>
                <div className="grid grid-cols-2 gap-4">
                     {isLoading ? (
                        <>
                            <Skeleton className="h-24" />
                            <Skeleton className="h-24" />
                        </>
                    ) : (
                        <>
                            <StatCard 
                                title="New Messages" 
                                value={unreadMessagesCount} 
                                icon={MessageSquare} 
                                href="/chat"
                                color="bg-sky-500/20 text-sky-400"
                            />
                            <StatCard 
                                title="Pending Approvals" 
                                value={pendingReqs?.length || 0} 
                                icon={CheckCircle}
                                href="/requisitions"
                                color="bg-emerald-500/20 text-emerald-400"
                            />
                        </>
                    )}
                </div>
            </div>

            <Announcements />
        </div>
    );
}
