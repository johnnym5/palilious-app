import { StatCard } from "@/components/dashboard/StatCard";
import { mockCompanyGoals, mockCurrentUser, mockRequisitions, mockTasks } from "@/lib/placeholder-data";
import { Activity, Briefcase, CheckCircle2, DollarSign, Users } from "lucide-react";
import { Announcements } from "@/components/dashboard/Announcements";
import { UpcomingBirthdays } from "@/components/dashboard/UpcomingBirthdays";
import { CompanyGoals } from "@/components/dashboard/CompanyGoals";
import QuickActions from "@/components/dashboard/QuickActions";

export default function DashboardPage() {
    const user = mockCurrentUser;
    const pendingRequisitions = mockRequisitions.filter(r => r.status.startsWith('PENDING')).length;
    const myTasks = mockTasks.filter(t => t.assignedTo.id === user.id && !t.isCompleted).length;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Welcome back, {user.fullName.split(' ')[0]}!</h1>
                <p className="text-muted-foreground">Here&apos;s a snapshot of what&apos;s happening in your workspace today.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="My Pending Tasks" value={myTasks} icon={Briefcase} />
                <StatCard title="Pending Requisitions" value={pendingRequisitions} icon={DollarSign} />
                <StatCard title="Active Team Members" value="12" icon={Users} />
                <StatCard title="Projects Completed" value="8" icon={CheckCircle2} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <QuickActions />
                    <CompanyGoals goals={mockCompanyGoals} />
                </div>
                <div className="space-y-6">
                    <Announcements />
                    <UpcomingBirthdays />
                </div>
            </div>
        </div>
    );
}
