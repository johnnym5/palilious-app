'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import type { Workbook, Sheet, UserProfile, WorkbookRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Plus, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetDataTable } from '@/components/workbook/SheetDataTable';
import { useState, useMemo } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddSheetDialog } from '@/components/workbook/AddSheetDialog';
import { RenameSheetDialog } from '@/components/workbook/RenameSheetDialog';

interface WorkbookPermissions {
    canView: boolean;
    canEdit: boolean;
    canManage: boolean;
}

const useWorkbookPermissions = (workbook: Workbook | null, userProfile: UserProfile | null): WorkbookPermissions => {
    return useMemo(() => {
        const defaultPerms = { canView: false, canEdit: false, canManage: false };
        if (!workbook || !userProfile) return defaultPerms;

        // Owner has all permissions
        if (workbook.createdBy === userProfile.id) {
            return { canView: true, canEdit: true, canManage: true };
        }

        // Check sharedWith array
        const userShare = workbook.sharedWith?.find(s => s.userId === userProfile.id);
        if (!userShare) return defaultPerms;

        return {
            canView: true,
            canEdit: userShare.role === 'EDITOR' || userShare.role === 'MANAGER',
            canManage: userShare.role === 'MANAGER'
        };

    }, [workbook, userProfile]);
};


export default function WorkbookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { user: authUser } = useUser();

    const workbookId = params.workbookId as string;

    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [sheetToRename, setSheetToRename] = useState<Sheet | null>(null);
    const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const workbookRef = useMemoFirebase(() => doc(firestore, 'workbooks', workbookId), [firestore, workbookId]);
    const { data: workbook, isLoading: isWorkbookLoading } = useDoc<Workbook>(workbookRef);

    const sheetsQuery = useMemoFirebase(() => 
        query(collection(firestore, `workbooks/${workbookId}/sheets`)), 
    [firestore, workbookId]);
    const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);

    const permissions = useWorkbookPermissions(workbook, userProfile);

    const isLoading = isWorkbookLoading || areSheetsLoading || isProfileLoading;

    const handleDeleteSheet = () => {
        if (!sheetToDelete || !permissions.canEdit) return;
        const sheetRef = doc(firestore, `workbooks/${workbookId}/sheets`, sheetToDelete.id);
        deleteDocumentNonBlocking(sheetRef);
        setSheetToDelete(null);
    }
    
    if (!isLoading && !permissions.canView) {
      return (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
              <p className="text-muted-foreground mt-2">You do not have permission to view this workbook.</p>
              <Button onClick={() => router.push('/workbook')} className="mt-6">Return to Workbooks</Button>
            </div>
      )
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Card>
                    <CardHeader><Skeleton className="h-10 w-1/4" /></CardHeader>
                    <CardContent><Skeleton className="h-[60vh] w-full" /></CardContent>
                </Card>
            </div>
        )
    }

    if (!workbook) {
        return <p>Workbook not found.</p>;
    }

    return (
        <>
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">{workbook.title}</h1>
                    <p className="text-muted-foreground">{workbook.description || 'No description provided.'}</p>
                </div>

                {sheets && sheets.length > 0 ? (
                    <Card>
                        <Tabs defaultValue={sheets[0].id} className="h-full flex flex-col">
                            <CardHeader>
                                <div className='flex items-center gap-2'>
                                    <TabsList>
                                        {sheets.map(sheet => (
                                            <div key={sheet.id} className="flex items-center group">
                                                <TabsTrigger value={sheet.id}>{sheet.name}</TabsTrigger>
                                                 {permissions.canEdit && (
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => setSheetToRename(sheet)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Rename
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => setSheetToDelete(sheet)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                 )}
                                            </div>
                                        ))}
                                    </TabsList>
                                    {permissions.canEdit && (
                                        <AddSheetDialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen} workbookId={workbookId}>
                                            <Button variant="outline" size="icon" className='h-10 w-10'>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </AddSheetDialog>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                {sheets.map(sheet => (
                                    <TabsContent key={sheet.id} value={sheet.id} className="h-full">
                                        <SheetDataTable sheet={sheet} permissions={permissions} />
                                    </TabsContent>
                                ))}
                            </CardContent>
                        </Tabs>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            This workbook has no sheets yet.
                            {permissions.canEdit && (
                                <AddSheetDialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen} workbookId={workbookId}>
                                    <Button variant="outline" className="mt-4">
                                        <Plus className="mr-2 h-4 w-4" /> Add First Sheet
                                    </Button>
                                </AddSheetDialog>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
            
            {sheetToRename && (
                <RenameSheetDialog
                    open={!!sheetToRename}
                    onOpenChange={(isOpen) => !isOpen && setSheetToRename(null)}
                    sheet={sheetToRename}
                />
            )}

            {sheetToDelete && (
                <AlertDialog open={!!sheetToDelete} onOpenChange={(isOpen) => !isOpen && setSheetToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete sheet "{sheetToDelete.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. All data in this sheet will be permanently deleted.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSheet} className="bg-destructive hover:bg-destructive/90">
                                Delete Sheet
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
