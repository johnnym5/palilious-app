'use client';
import { useState } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { UserProfile, Workbook } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, ShieldAlert, BookCopy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { NewWorkbookDialog } from '@/components/workbook/NewWorkbookDialog';
import { format } from 'date-fns';

function WorkbookList({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const workbooksQuery = useMemoFirebase(() => {
        return query(
            collection(firestore, 'workbooks'),
            where('orgId', '==', userProfile.orgId)
        )
    }, [firestore, userProfile]);

    const { data: workbooks, isLoading } = useCollection<Workbook>(workbooksQuery);

    if (isLoading) {
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
    }

    if (!workbooks || workbooks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg text-center h-64">
                <BookCopy className="w-12 h-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold">No Workbooks Yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first workbook.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workbooks.map(workbook => (
                <Card key={workbook.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                        <CardTitle>{workbook.title}</CardTitle>
                        <CardDescription>{workbook.description || "No description."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Created by {workbook.creatorName} on {format(new Date(workbook.createdAt), 'PP')}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}


export default function WorkbookPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);

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
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
       <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Master Workbook</h1>
          <p className="text-muted-foreground">
            Create, manage, and distribute work from master documents.
          </p>
         </div>
       </div>

       <WorkbookList userProfile={userProfile!} />
      
       <NewWorkbookDialog open={isNewWorkbookOpen} onOpenChange={setIsNewWorkbookOpen} userProfile={userProfile!}>
            <Button 
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg shadow-primary/30 z-10" 
                onClick={() => setIsNewWorkbookOpen(true)}
                aria-label="New Workbook"
            >
              <Plus className="h-8 w-8" />
            </Button>
        </NewWorkbookDialog>
    </div>
  );
}
