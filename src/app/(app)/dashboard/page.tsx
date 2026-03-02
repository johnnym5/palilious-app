'use client';
import { StatCard } from "@/components/dashboard/StatCard";
import { Briefcase, CheckCircle, Clock, Users } from "lucide-react";
import { Announcements } from "@/components/dashboard/Announcements";
import { ActiveTasks } from "@/components/dashboard/ActiveTasks";
import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile, Task, Requisition, TaskStatus, RequisitionStatus } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export default function DashboardPage() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null, 
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

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

    const StatCards = () => (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
                <>
                    <Skeleton className="h-[98px]" />
                    <Skeleton className="h-[98px]" />
                    <Skeleton className="h-[98px]" />
                    <Skeleton className="h-[98px]" />
                </>
            ) : (
                <>
                    <StatCard title="Active Tasks" value={activeTaskCount} icon={CheckCircle} />
                    <StatCard title="Clock-in Status" value={userProfile?.status || "OFFLINE"} icon={Clock} />
                    <StatCard title="Pending Requisitions" value={pendingReqsCount} icon={Briefcase} />
                    <StatCard title="Staff Online" value={onlineStaffCount} icon={Users} />
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
                </div>
            </div>
        </div>
    );
}
