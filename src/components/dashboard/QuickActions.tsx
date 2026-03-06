'use client';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { BookOpenCheck, FilePlus2, ListTodo } from "lucide-react";
import { useState } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { AssignTaskDialog } from "../tasks/AssignTaskDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { NewRequisitionDialog } from "../requisitions/NewRequisitionDialog";
import { NewWorkbookDialog } from '../workbook/NewWorkbookDialog';
import { Skeleton } from "../ui/skeleton";

export default function QuickActions() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
    const [isNewRequisitionOpen, setIsNewRequisitionOpen] = useState(false);
    const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);

    const userProfileRef = useMemoFirebase(() => 
      authUser ? doc(firestore, 'users', authUser.uid) : null
    , [firestore, authUser]);
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    if (isLoading) {
        return <Skeleton className="h-40 w-full" />
    }

    if (!userProfile) {
        return null;
    }

    return (
      <>
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Your most common tasks, just a click away.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button variant="outline" size="lg" className="flex-col h-auto py-4 w-full" onClick={() => setIsNewWorkbookOpen(true)}>
                    <BookOpenCheck className="h-6 w-6 mb-2 text-primary"/>
                    <span className="font-semibold">New Workbook</span>
                </Button>
                
                {permissions.canAccessRequisitions && (
                    <Button variant="outline" size="lg" className="flex-col h-auto py-4 w-full" onClick={() => setIsNewRequisitionOpen(true)}>
                        <FilePlus2 className="h-6 w-6 mb-2 text-primary"/>
                        <span className="font-semibold">New Requisition</span>
                    </Button>
                )}
                
                <Button variant="outline" size="lg" className="flex-col h-auto py-4 w-full" onClick={() => setIsAssignTaskOpen(true)}>
                    <ListTodo className="h-6 w-6 mb-2 text-primary"/>
                    <span className="font-semibold">Add a Task</span>
                </Button>
            </CardContent>
        </Card>

        <NewWorkbookDialog 
            open={isNewWorkbookOpen} 
            onOpenChange={setIsNewWorkbookOpen} 
            userProfile={userProfile}
        />
        <NewRequisitionDialog 
            open={isNewRequisitionOpen} 
            onOpenChange={setIsNewRequisitionOpen} 
            userProfile={userProfile}
        />
        <AssignTaskDialog 
            open={isAssignTaskOpen} 
            onOpenChange={setIsAssignTaskOpen} 
            currentUserProfile={userProfile} 
            permissions={permissions}
            initialData={null}
        />
      </>
    );
}
