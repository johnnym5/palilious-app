'use client';
import { StatCard } from "@/components/dashboard/StatCard";
import { Briefcase, CheckCircle, Clock, Users, Plus } from "lucide-react";
import { Announcements } from "@/components/dashboard/Announcements";
import { ActiveTasks } from "@/components/dashboard/ActiveTasks";
import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile, Task, Requisition, TaskStatus, RequisitionStatus } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { NewAnnouncementDialog } from "@/components/dashboard/NewAnnouncementDialog";


export default function DashboardPage() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const [isAddOpen, setIsAddOpen] = useState(false);

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null, 
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    // Query for user's tasks
    const tasksQuery = useMemoFirebase(() => {
        if (!authUser) return null;
        return query(
            collection(firestore, 'tasks'),
            where('assignedTo', '==', authUser.uid)
        );
    }, [firestore, authUser]);
    const { data: allTasks, isLoading: tasksLoading } = useCollection<Task>(tasksQuery);
    
    const activeTaskCount = useMemo(() => {
        if (!allTasks) return 0;
        const activeStatuses: TaskStatus[] = ['QUEUED', 'ACTIVE', 'AWAITING_REVIEW'];
        return allTasks.filter(task => activeStatuses.includes(task.status)).length;
    }, [allTasks]);


    // Query for user's requisitions
    const reqsQuery = useMemoFirebase(() => {
        if (!authUser) return null;
        return query(
            collection(firestore, 'requisitions'),
            where('createdBy', '==', authUser.uid)
        );
    }, [firestore, authUser]);
    const { data: allReqs, isLoading: reqsLoading } = useCollection<Requisition>(reqsQuery);

    const pendingReqsCount = useMemo(() => {
        if (!allReqs) return 0;
        const pendingStatuses: RequisitionStatus[] = ['PENDING_HR', 'PENDING_FINANCE', 'PENDING_MD'];
        return allReqs.filter(req => pendingStatuses.includes(req.status)).length;
    }, [allReqs]);

    // Query for org's staff
    const staffQuery = useMemoFirebase(() => {
        if (!userProfile) return null;
        return query(
            collection(firestore, 'users'),
            where('orgId', '==', userProfile.orgId)
        );
    }, [firestore, userProfile]);
    const { data: allStaff, isLoading: staffLoading } = useCollection<UserProfile>(staffQuery);

    const onlineStaffCount = useMemo(() => {
        if (!allStaff) return 0;
        return allStaff.filter(staff => staff.status === 'ONLINE').length;
    }, [allStaff]);
    

    const isLoading = isProfileLoading || tasksLoading || reqsLoading || staffLoading;
    
    // Progress bar calculations
    const tasksProgress = Math.min((activeTaskCount / 5) * 100, 100);
    const clockInStatusProgress = userProfile?.status === 'ONLINE' ? 100 : 0;
    const reqsProgress = Math.min((pendingReqsCount / 3) * 100, 100);
    const onlineStaffProgress = allStaff && allStaff.length > 0 ? (onlineStaffCount / allStaff.length) * 100 : 0;


    const StatCards = () => (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
                <>
                    <Skeleton className="h-[124px]" />
                    <Skeleton className="h-[124px]" />
                    <Skeleton className="h-[124px]" />
                    <Skeleton className="h-[124px]" />
                </>
            ) : (
                <>
                    <StatCard 
                        title="Active Tasks" 
                        value={activeTaskCount} 
                        icon={CheckCircle} 
                        href="/tasks"
                        progress={tasksProgress}
                        color="text-sky-500"
                    />
                    <StatCard 
                        title="Clock-in Status" 
                        value={userProfile?.status || "OFFLINE"} 
                        icon={Clock} 
                        href="/attendance"
                        progress={clockInStatusProgress}
                        color={userProfile?.status === 'ONLINE' ? "text-emerald-500" : "text-muted-foreground"}
                    />
                    <StatCard 
                        title="Pending Requisitions" 
                        value={pendingReqsCount} 
                        icon={Briefcase} 
                        href="/requisitions"
                        progress={reqsProgress}
                        color="text-amber-500"
                    />
                    <StatCard 
                        title="Staff Online" 
                        value={onlineStaffCount} 
                        icon={Users}
                        href="/team"
                        progress={onlineStaffProgress}
                        color="text-violet-500"
                    />
                </>
            )}
        </div>
    );

    return (
        <div className="flex flex-col gap-8">
            <StatCards />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <ActiveTasks />
                </div>
                <div className="space-y-6">
                    <Announcements />
                    <RecentConversations />
                </div>
            </div>
             {permissions.canManageAnnouncements && userProfile && (
                <NewAnnouncementDialog open={isAddOpen} onOpenChange={setIsAddOpen} userProfile={userProfile}>
                    <Button 
                        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg shadow-primary/30 z-40" 
                        onClick={() => setIsAddOpen(true)}
                        aria-label="New Announcement"
                    >
                        <Plus className="h-8 w-8" />
                    </Button>
                </NewAnnouncementDialog>
            )}
        </div>
    );
}
