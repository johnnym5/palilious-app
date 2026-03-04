'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { ShieldAlert } from "lucide-react";
import { FinancialReport } from '@/components/reports/FinancialReport';
import { AttendanceReport } from "@/components/reports/AttendanceReport";

export default function ReportsPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  if (isProfileLoading) {
    return <Skeleton className="h-screen w-full" />
  }

  if (!isProfileLoading && !permissions.canManageStaff) {
      return (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
              <p className="text-muted-foreground mt-2">You do not have permission to view reports.</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-6">Return to Dashboard</Button>
            </div>
      )
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Visualize your organization's performance and key metrics.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-1 items-start">
        {userProfile && <FinancialReport userProfile={userProfile} />}
        {userProfile && <AttendanceReport userProfile={userProfile} />}
      </div>
    </div>
  );
}
