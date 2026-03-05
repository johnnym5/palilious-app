'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { AttendanceReport } from "@/components/reports/AttendanceReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitDailyReport } from "@/components/reports/SubmitDailyReport";
import { MyDailyReports } from "@/components/reports/MyDailyReports";
import { TeamDailyReports } from "@/components/reports/TeamDailyReports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceHistory } from "@/components/attendance/AttendanceHistory";

export default function ReportsPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  if (isProfileLoading) {
    return <Skeleton className="h-screen w-full" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
            {permissions.canManageStaff ? "Analyze performance and review team reports." : "Submit your daily report and view your history."}
        </p>
      </div>

      {permissions.canManageStaff ? (
        <Tabs defaultValue="analytics">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="team-reports">Team Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics" className="mt-4 space-y-6">
            {userProfile && <FinancialReport userProfile={userProfile} />}
            {userProfile && <AttendanceReport userProfile={userProfile} />}
          </TabsContent>
          <TabsContent value="team-reports" className="mt-4">
            {userProfile && <TeamDailyReports userProfile={userProfile} />}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
            <div className="space-y-6">
                {userProfile && <SubmitDailyReport userProfile={userProfile} />}
                {userProfile && <MyDailyReports userProfile={userProfile} />}
            </div>
             <div className="space-y-6">
                {userProfile && <AttendanceHistory userProfile={userProfile} />}
            </div>
        </div>
      )}
    </div>
  );
}
