'use client';
import { StatCard } from "@/components/dashboard/StatCard";
import { CheckCircle, MessageSquare } from "lucide-react";
import { ActiveTasks } from "@/components/dashboard/ActiveTasks";
import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile, Task, Requisition, TaskStatus, RequisitionStatus, Chat } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect } from "react";
import { PerformanceCard } from "@/components/dashboard/PerformanceCard";

export default function DashboardPage() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null, 
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    // Fetch pending approvals for requisitions and attendance
    const reqsQuery = useMemoFirebase(() => {
        if (!userProfile) return null;
        const inboxStatuses: string[] = [];
        if (userProfile.position.includes("HR")) inboxStatuses.push('PENDING_HR');
        if (userProfile.position.includes("Finance")) inboxStatuses.push('PENDING_FINANCE', 'APPROVED');
        if (userProfile.position.includes("Director")) inboxStatuses.push('PENDING_MD');
        if (userProfile.position.includes("Administrator")) {
            inboxStatuses.push('PENDING_HR', 'PENDING_FINANCE', 'APPROVED', 'PENDING_MD');
        }
        
        if (inboxStatuses.length === 0) return null;
        
        return query(
            collection(firestore, 'requisitions'),
            where('orgId', '==', userProfile.orgId),
            where('status', 'in', [...new Set(inboxStatuses)])
        );
    }, [firestore, userProfile]);
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
        // For now, we'll just count chats where the last message isn't from the current user.
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

            <div className="space-y-2">
                <h2 className="text-xl font-bold font-headline">Recent Updates</h2>
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
                                title="Approvals" 
                                value={pendingReqs?.length || 0} 
                                icon={CheckCircle}
                                href="/requisitions"
                                color="bg-emerald-500/20 text-emerald-400"
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
