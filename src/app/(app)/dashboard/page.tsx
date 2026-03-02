'use client';
import { useState, useEffect } from 'react';
import { StatCard } from "@/components/dashboard/StatCard";
import { useCollection, useUser, useMemoFirebase, useFirestore } from "@/firebase";
import { Briefcase, CheckCircle, Clock, Users } from "lucide-react";
import { Announcements } from "@/components/dashboard/Announcements";
import QuickActions from "@/components/dashboard/QuickActions";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Requisition, Task, UserProfile, Attendance } from "@/lib/types";
import { format } from "date-fns";
import { TodaysCelebrations } from '@/components/dashboard/TodaysCelebrations';

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const userFirstName = user?.displayName?.split(' ')[0] || 'there';

    // Queries
    const myRequisitionsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'requisitions'), where('createdBy', '==', user.uid), where('status', 'in', ['PENDING_HR', 'PENDING_FINANCE', 'PENDING_MD']));
    }, [firestore, user]);

    const activeTasksQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'tasks'), where('assignedTo', '==', user.uid), where('isCompleted', '==', false));
    }, [firestore, user]);

    const onlineUsersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('status', '==', 'ONLINE'));
    }, [firestore]);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const attendanceTodayQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'attendance'), where('userId', '==', user.uid), where('date', '==', todayStr));
    }, [firestore, user, todayStr]);


    // Data hooks
    const { data: myRequisitions, isLoading: requisitionsLoading } = useCollection<Requisition>(myRequisitionsQuery);
    const { data: activeTasks, isLoading: tasksLoading } = useCollection<Task>(activeTasksQuery);
    const { data: onlineUsers, isLoading: onlineUsersLoading } = useCollection<UserProfile>(onlineUsersQuery);
    const { data: attendanceToday, isLoading: attendanceLoading } = useCollection<Attendance>(attendanceTodayQuery);

    const clockInStatus = attendanceToday?.length > 0
        ? (attendanceToday[0].clockOut ? 'Clocked Out' : 'Clocked In')
        : 'Not Clocked In';

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <div className='flex justify-between items-center'>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Welcome back, {userFirstName}!</h1>
                    <div className='hidden sm:flex items-center gap-2 text-muted-foreground'>
                        <Clock className='h-4 w-4' />
                        <p>{format(currentTime, 'PPP, p')}</p>
                    </div>
                </div>
                <p className="text-muted-foreground">Here&apos;s a snapshot of what&apos;s happening in your workspace today.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="My Pending Requisitions" value={requisitionsLoading ? '...' : myRequisitions?.length ?? 0} icon={Briefcase} />
                <StatCard title="Active Tasks" value={tasksLoading ? '...' : activeTasks?.length ?? 0} icon={CheckCircle} />
                <StatCard title="Clock-in Status" value={attendanceLoading ? '...' : clockInStatus} icon={Clock} />
                <StatCard title="Total Staff Online" value={onlineUsersLoading ? '...' : onlineUsers?.length ?? 0} icon={Users} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <QuickActions />
                    <Announcements />
                </div>
                <div className="space-y-6">
                    <TodaysCelebrations />
                </div>
            </div>
        </div>
    );
}
