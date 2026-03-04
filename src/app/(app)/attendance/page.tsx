'use client';
import { ClockControl } from "@/components/attendance/ClockControl";
import { StatusFeed } from "@/components/attendance/StatusFeed";
import { AttendanceHistory } from "@/components/attendance/AttendanceHistory";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingApprovals } from "@/components/attendance/PendingApprovals";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamAttendanceHistory } from "@/components/attendance/TeamAttendanceHistory";

export default function AttendancePage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
  const permissions = usePermissions(userProfile);

  const isLoading = isProfileLoading || isConfigLoading;

  if (isLoading) {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-8">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
            <div className="lg:col-span-2">
                <Skeleton className="h-80 w-full" />
            </div>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Attendance Center</h1>
        <p className="text-muted-foreground">Manage your work hours and see who's currently online.</p>
      </div>
      
      {permissions.canManageStaff && userProfile ? (
         <Tabs defaultValue="my-view">
            <TabsList>
                <TabsTrigger value="my-view">My View</TabsTrigger>
                <TabsTrigger value="team-history">Team History</TabsTrigger>
            </TabsList>
            <TabsContent value="my-view" className="mt-4">
                 <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-8">
                        <ClockControl userProfile={userProfile} permissions={permissions} systemConfig={systemConfig} />
                        <StatusFeed userProfile={userProfile} permissions={permissions} />
                    </div>
                    <div className="lg:col-span-2 space-y-8">
                        {permissions.canApproveHR && <PendingApprovals userProfile={userProfile} />}
                        <AttendanceHistory userProfile={userProfile} />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="team-history" className="mt-4">
                <TeamAttendanceHistory userProfile={userProfile} />
            </TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-8">
              <ClockControl userProfile={userProfile} permissions={permissions} systemConfig={systemConfig} />
              <StatusFeed userProfile={userProfile} permissions={permissions} />
          </div>
          <div className="lg:col-span-2 space-y-8">
              {userProfile && permissions.canApproveHR && <PendingApprovals userProfile={userProfile} />}
              <AttendanceHistory userProfile={userProfile} />
          </div>
        </div>
      )}
    </div>
  );
}
