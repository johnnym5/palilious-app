'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import type { Workbook, Sheet, UserProfile, WorkbookRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Plus, MoreVertical, Trash2, Edit, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetDataTable } from '@/components/workbook/SheetDataTable';
import { useState, useMemo, useEffect } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddSheetDialog } from '@/components/workbook/AddSheetDialog';
import { RenameSheetDialog } from '@/components/workbook/RenameSheetDialog';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
    const searchParams = useSearchParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { user: authUser } = useUser();

    const workbookId = searchParams.get('workbookId');

    const [activeTab, setActiveTab] = useState<string | undefined>();
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [sheetToRename, setSheetToRename] = useState<Sheet | null>(null);
    const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);
    const [sheetToMakeTask, setSheetToMakeTask] = useState<Sheet | null>(null);

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const workbookRef = useMemoFirebase(() => workbookId ? doc(firestore, 'workbooks', workbookId) : null, [firestore, workbookId]);
    const { data: workbook, isLoading: isWorkbookLoading } = useDoc<Workbook>(workbookRef);

    const sheetsQuery = useMemoFirebase(() => 
        workbookId ? query(collection(firestore, `workbooks/${workbookId}/sheets`)) : null, 
    [firestore, workbookId]);
    const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);
    
    useEffect(() => {
        if (!activeTab && sheets && sheets.length > 0) {
            setActiveTab(sheets[0].id);
        }
    }, [sheets, activeTab]);

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

                {sheets && sheets.length > 0 && workbookId ? (
                    <Card>
                        <Tabs defaultValue={sheets[0].id} value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <CardHeader>
                                <div className='flex items-center gap-2'>
                                    <ScrollArea className="max-w-[calc(100vw-12rem)] lg:max-w-3xl whitespace-nowrap rounded-md">
                                        <TabsList>
                                            {sheets.map(sheet => (
                                                <div key={sheet.id} className="flex items-center group">
                                                    <TabsTrigger value={sheet.id}>{sheet.name}</TabsTrigger>
                                                     {workbookPermissions.canManage && (
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
                                                                 <DropdownMenuItem onSelect={() => setSheetToMakeTask(sheet)}>
                                                                    <ListTodo className="mr-2 h-4 w-4" /> Create Task
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
                                        <ScrollBar orientation="horizontal" className="h-2.5" />
                                    </ScrollArea>
                                    {workbookPermissions.canEdit && (
                                        <AddSheetDialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen} workbookId={workbookId}>
                                            <Button variant="outline" size="icon" className='h-10 w-10 shrink-0'>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </AddSheetDialog>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                {sheets.map(sheet => (
                                    <TabsContent key={sheet.id} value={sheet.id} className="h-full">
                                        <SheetDataTable sheet={sheet} permissions={workbookPermissions} />
                                    </TabsContent>
                                ))}
                            </CardContent>
                        </Tabs>
                    </Card>
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
            
            {activeTab && workbookPermissions.canEdit && userProfile && (
                <Button
                    className="fixed bottom-6 right-24 h-16 w-16 rounded-full shadow-lg shadow-primary/30 z-40"
                    onClick={() => {
                        const currentSheet = sheets?.find(s => s.id === activeTab);
                        if (currentSheet) {
                            setSheetToMakeTask(currentSheet);
                        }
                    }}
                    aria-label="Create Task from Sheet"
                >
                    <ListTodo className="h-8 w-8" />
                </Button>
            )}

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
