'use client';
import { StatCard } from "@/components/dashboard/StatCard";
import { useCollection, useUser, useMemoFirebase, useFirestore } from "@/firebase";
import { Briefcase, CheckCircle2, DollarSign, Users } from "lucide-react";
import { Announcements } from "@/components/dashboard/Announcements";
import { UpcomingBirthdays } from "@/components/dashboard/UpcomingBirthdays";
import QuickActions from "@/components/dashboard/QuickActions";
import { collection, query, where } from "firebase/firestore";
import { Requisition, Task } from "@/lib/types";

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const requisitionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'requisitions'), where('status', 'in', ['PENDING_HR', 'PENDING_FINANCE', 'PENDING_MD']));
    }, [firestore]);

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'tasks'), where('assignedTo', '==', user.uid), where('isCompleted', '==', false));
    }, [firestore, user]);

    const { data: requisitions, isLoading: requisitionsLoading } = useCollection<Requisition>(requisitionsQuery);
    const { data: tasks, isLoading: tasksLoading } = useCollection<Task>(tasksQuery);

    const pendingRequisitions = requisitions ? requisitions.length : 0;
    const myTasks = tasks ? tasks.length : 0;

    const userFirstName = user?.displayName?.split(' ')[0] || 'there';

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Welcome back, {userFirstName}!</h1>
                <p className="text-muted-foreground">Here&apos;s a snapshot of what&apos;s happening in your workspace today.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="My Pending Tasks" value={tasksLoading ? '...' : myTasks} icon={Briefcase} />
                <StatCard title="Pending Requisitions" value={requisitionsLoading ? '...' : pendingRequisitions} icon={DollarSign} />
                <StatCard title="Active Team Members" value="12" icon={Users} />
                <StatCard title="Projects Completed" value="8" icon={CheckCircle2} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <QuickActions />
                </div>
                <div className="space-y-6">
                    <Announcements />
                    <UpcomingBirthdays />
                </div>
            </div>
        </div>
    );
}
