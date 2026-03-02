'use client';
import { useState, useEffect } from 'react';
import { StatCard } from "@/components/dashboard/StatCard";
import { useSimpleAuth } from "@/hooks/use-simple-auth";
import { Briefcase, CheckCircle, Clock, Users } from "lucide-react";
import { Announcements } from "@/components/dashboard/Announcements";
import QuickActions from "@/components/dashboard/QuickActions";
import { format } from "date-fns";
import { TodaysCelebrations } from '@/components/dashboard/TodaysCelebrations';

export default function DashboardPage() {
    const { user } = useSimpleAuth();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const userFirstName = user?.displayName?.split(' ')[0] || 'there';

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
                <p className="text-muted-foreground">Here&apos;s a snapshot of what&apos;s happening in your workspace today. (Live data is temporarily disabled)</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="My Pending Requisitions" value={0} icon={Briefcase} />
                <StatCard title="Active Tasks" value={0} icon={CheckCircle} />
                <StatCard title="Clock-in Status" value={"Disabled"} icon={Clock} />
                <StatCard title="Total Staff Online" value={1} icon={Users} />
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
