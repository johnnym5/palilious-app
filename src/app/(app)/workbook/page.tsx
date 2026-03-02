'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function WorkbookPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const permissions = usePermissions(userProfile);

  if (isProfileLoading) {
    return <Skeleton className="h-[calc(100vh-12rem)] w-full" />
  }

  if (!permissions.canManageStaff) {
      return (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
              <p className="text-muted-foreground mt-2">You do not have the required permissions to view this page.</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-6">Return to Dashboard</Button>
            </div>
      )
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Master Workbook</h1>
          <p className="text-muted-foreground">
            Import, distribute, and manage work from master documents.
          </p>
         </div>
       </div>
       <Card>
            <CardHeader>
                <CardTitle>Import Master Sheet</CardTitle>
                <CardDescription>Upload an Excel or Word document to begin distribution.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">Drag & drop your file here, or click to browse.</p>
                    <Button variant="outline" className="mt-4">
                        Select File
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">(Full parser and template functionality coming soon)</p>
                </div>
            </CardContent>
       </Card>
    </div>
  );
}
