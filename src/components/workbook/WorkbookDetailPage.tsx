'use client';

import { useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import type { Workbook, Sheet, UserProfile, WorkbookRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Plus, MoreVertical, Trash2, Edit, ListTodo, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetDataTable } from '@/components/workbook/SheetDataTable';
import { useState, useMemo, useEffect } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddSheetDialog } from '@/components/workbook/AddSheetDialog';
import { RenameSheetDialog } from '@/components/workbook/RenameSheetDialog';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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

interface WorkbookDetailPageProps {
    workbookId: string;
    initialSheetId?: string | null;
    onBack: () => void;
}


export default function WorkbookDetailPage({ workbookId, initialSheetId, onBack }: WorkbookDetailPageProps) {
    const firestore = useFirestore();
    const { user: authUser } = useUser();

    const [activeTab, setActiveTab] = useState<string | undefined>();
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [sheetToRename, setSheetToRename] = useState<Sheet | null>(null);
    const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);
    const [sheetToMakeTask, setSheetToMakeTask] = useState<Sheet | null>(null);

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const workbookRef = useMemoFirebase(() => firestore && workbookId ? doc(firestore, 'workbooks', workbookId) : null, [firestore, workbookId]);
    const { data: workbook, isLoading: isWorkbookLoading } = useDoc<Workbook>(workbookRef);

    const sheetsQuery = useMemoFirebase(() => 
        firestore && workbookId ? query(collection(firestore, `workbooks/${workbookId}/sheets`)) : null, 
    [firestore, workbookId]);
    const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);
    
    const activeTabStorageKey = `workbook-active-tab-${workbookId}`;

    useEffect(() => {
        if (sheets && sheets.length > 0) {
            if (initialSheetId && sheets.some(s => s.id === initialSheetId)) {
                setActiveTab(initialSheetId);
                return;
            }
            const savedTabId = localStorage.getItem(activeTabStorageKey);
            const isValidSavedTab = sheets.some(s => s.id === savedTabId);
            
            if (savedTabId && isValidSavedTab) {
                setActiveTab(savedTabId);
            } else {
                setActiveTab(sheets[0].id);
            }
        }
    }, [sheets, workbookId, activeTabStorageKey, initialSheetId]);

    useEffect(() => {
        if (activeTab) {
            localStorage.setItem(activeTabStorageKey, activeTab);
        }
    }, [activeTab, activeTabStorageKey]);

    const workbookPermissions = useWorkbookPermissions(workbook, userProfile);
    const generalPermissions = usePermissions(userProfile);


    const isLoading = isWorkbookLoading || areSheetsLoading || isProfileLoading;

    const handleDeleteSheet = () => {
        if (!sheetToDelete || !workbookPermissions.canEdit || !workbookId) return;
        const sheetRef = doc(firestore, `workbooks/${workbookId}/sheets`, sheetToDelete.id);
        deleteDocumentNonBlocking(sheetRef);
        setSheetToDelete(null);
    }
    
    if (!isLoading && !workbookPermissions.canView) {
      return (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
              <p className="text-muted-foreground mt-2">You do not have permission to view this workbook.</p>
              <Button onClick={onBack} className="mt-6">Return to Workbooks</Button>
            </div>
      )
    }
    
    if (isLoading) {
        return (
            <div className="space-y-4 p-6">
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
        return <p className="p-6">Workbook not found.</p>;
    }

    return (
        <>
            <div className="space-y-4 p-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold font-headline tracking-tight">{workbook.title}</h1>
                        <p className="text-muted-foreground">{workbook.description || 'No description provided.'}</p>
                    </div>
                </div>

                {sheets && sheets.length > 0 && workbookId ? (
                     <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex items-center justify-between gap-4">
                            <TabsList>
                                {sheets.map(sheet => (
                                    <TabsTrigger key={sheet.id} value={sheet.id} className="relative group pr-8">
                                        {sheet.name}
                                        {workbookPermissions.canManage && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem onSelect={() => setSheetToRename(sheet)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => setSheetToMakeTask(sheet)}>
                                                        <ListTodo className="mr-2 h-4 w-4" /> Create Task
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => setSheetToDelete(sheet)} className="text-destructive focus:text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {workbookPermissions.canEdit && (
                                <AddSheetDialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen} workbookId={workbookId}>
                                    <Button variant="outline">
                                        <Plus className="mr-2 h-4 w-4" /> Add Sheet
                                    </Button>
                                </AddSheetDialog>
                            )}
                        </div>
                        {sheets.map(sheet => (
                             <TabsContent key={sheet.id} value={sheet.id} className="mt-4">
                                <SheetDataTable sheet={sheet} permissions={workbookPermissions} />
                             </TabsContent>
                        ))}
                    </Tabs>
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            This workbook has no sheets yet.
                            {workbookPermissions.canEdit && workbookId && (
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

            {sheetToMakeTask && userProfile && (
                <AssignTaskDialog
                    open={!!sheetToMakeTask}
                    onOpenChange={(isOpen) => !isOpen && setSheetToMakeTask(null)}
                    currentUserProfile={userProfile}
                    permissions={generalPermissions}
                    initialData={{
                        title: `From Workbook: ${sheetToMakeTask.name}`,
                        description: `Complete the tasks outlined in the workbook sheet "${sheetToMakeTask.name}".`,
                        workbookId: sheetToMakeTask.workbookId,
                        sheetId: sheetToMakeTask.id,
                    }}
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
