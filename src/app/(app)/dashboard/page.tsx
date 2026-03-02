'use client';
import { StatCard } from "@/components/dashboard/StatCard";
import { Briefcase, CheckCircle, Clock, Users } from "lucide-react";
import { Announcements } from "@/components/dashboard/Announcements";
import { TodaysCelebrations } from '@/components/dashboard/TodaysCelebrations';
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CompanyGoal } from "@/components/dashboard/CompanyGoal";

export default function DashboardPage() {
    return (
        <div className="flex flex-col gap-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Active Tasks" value={0} icon={CheckCircle} />
                <StatCard title="Clock-in Status" value={"Disabled"} icon={Clock} />
                <StatCard title="Pending Requisitions" value={0} icon={Briefcase} />
                <StatCard title="Staff Online" value={1} icon={Users} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <ActivityFeed />
                </div>
                <div className="space-y-6">
                    <Announcements />
                    <TodaysCelebrations />
                    <CompanyGoal />
                </div>
            </div>
        </div>
    );
}
