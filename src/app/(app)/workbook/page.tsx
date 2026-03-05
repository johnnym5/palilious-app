'use client';
import { useState, useMemo } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { UserProfile, Workbook } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, ShieldAlert, BookCopy, MoreHorizontal, Edit, Trash2, Share2, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { NewWorkbookDialog } from '@/components/workbook/NewWorkbookDialog';
import { EditWorkbookDialog } from '@/components/workbook/EditWorkbookDialog';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ShareWorkbookDialog } from '@/components/workbook/ShareWorkbookDialog';
import WorkbookDetailPage from '@/components/workbook/WorkbookDetailPage';
import { Input } from '@/components/ui/input';

function WorkbookList({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [workbookToEdit, setWorkbookToEdit] = useState<Workbook | null>(null);
    const [workbookToDelete, setWorkbookToDelete] = useState<Workbook | null>(null);
    const [workbookToShare, setWorkbookToShare] = useState<Workbook | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const workbooksQuery = useMemoFirebase(() => {
        return query(
            collection(firestore, 'workbooks'),
            where('visibleTo', 'array-contains', userProfile.id)
        )
    }, [firestore, userProfile]);

    const { data: workbooks, isLoading } = useCollection<Workbook>(workbooksQuery);

    const filteredWorkbooks = useMemo(() => {
        if (!workbooks) return [];
        if (!searchTerm) return workbooks;
        return workbooks.filter(wb =>
            wb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wb.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [workbooks, searchTerm]);

    const handleDelete = () => {
        if (!workbookToDelete) return;
        const workbookRef = doc(firestore, 'workbooks', workbookToDelete.id);
        deleteDocumentNonBlocking(workbookRef);
        toast({ title: "Workbook Deleted", description: `"${workbookToDelete.title}" has been removed.` });
        setWorkbookToDelete(null);
    };

    const canManage = (workbook: Workbook) => {
        if (workbook.createdBy === userProfile.id) return true;
        const sharingInfo = workbook.sharedWith?.find(s => s.userId === userProfile.id);
        return sharingInfo?.role === 'MANAGER';
    }


    if (isLoading) {
        return (
            <>
                <div className="relative mb-4">
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-48" />)}
                </div>
            </>
        )
    }

    return (
        <>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search workbooks by title or description..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {filteredWorkbooks.length === 0 ? (
                 <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg text-center h-64">
                    <BookCopy className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold">{searchTerm ? 'No Workbooks Found' : 'No Workbooks Yet'}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{searchTerm ? 'Try a different search term.' : 'Get started by creating your first workbook or ask a colleague to share one.'}</p>
                </div>
            ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredWorkbooks.map(workbook => (
                        <Card key={workbook.id} className="group hover:shadow-md transition-shadow flex flex-col">
                            <CardHeader className="flex flex-row items-start justify-between">
                                <div className='flex-1 pr-2'>
                                    <CardTitle className="break-words">{workbook.title}</CardTitle>
                                    <CardDescription className="line-clamp-1">{workbook.description || "No description."}</CardDescription>
                                </div>
                            {canManage(workbook) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="shrink-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setWorkbookToShare(workbook)}>
                                            <Share2 className="mr-2 h-4 w-4" />
                                            <span>Share</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setWorkbookToEdit(workbook)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setWorkbookToDelete(workbook)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-xs text-muted-foreground">
                                    Created by {workbook.creatorName} on {format(new Date(workbook.createdAt), 'PP')}
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/workbook?workbookId=${workbook.id}`}>View Workbook</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {workbookToEdit && (
                <EditWorkbookDialog
                    open={!!workbookToEdit}
                    onOpenChange={(isOpen) => !isOpen && setWorkbookToEdit(null)}
                    workbook={workbookToEdit}
                />
            )}
             {workbookToShare && userProfile && (
                <ShareWorkbookDialog
                    open={!!workbookToShare}
                    onOpenChange={(isOpen) => !isOpen && setWorkbookToShare(null)}
                    workbook={workbookToShare}
                    currentUserProfile={userProfile}
                />
            )}

            {workbookToDelete && (
                <AlertDialog open={!!workbookToDelete} onOpenChange={(isOpen) => !isOpen && setWorkbookToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the workbook "{workbookToDelete.title}".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    )
}


export default function WorkbookPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);

  const workbookId = searchParams.get('workbookId');

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  if (isProfileLoading) {
    return <Skeleton className="h-[calc(100vh-12rem)] w-full" />
  }

  if (!userProfile) {
      return (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
              <p className="text-muted-foreground mt-2">Could not identify user profile.</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-6">Return to Dashboard</Button>
            </div>
      )
  }
  
  if (workbookId) {
      return <WorkbookDetailPage />;
  }

  return (
    <div className="space-y-6 min-h-[calc(100vh-10rem)]">
       <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Workbooks</h1>
          <p className="text-muted-foreground">
            Create, manage, and distribute work from master documents.
          </p>
         </div>
       </div>

       <WorkbookList userProfile={userProfile} />
      
       {userProfile && (
         <>
           <Button 
               className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg shadow-primary/30 z-40" 
               onClick={() => setIsNewWorkbookOpen(true)}
               aria-label="New Workbook"
           >
             <Plus className="h-8 w-8" />
           </Button>
           <NewWorkbookDialog open={isNewWorkbookOpen} onOpenChange={setIsNewWorkbookOpen} userProfile={userProfile} />
         </>
       )}
    </div>
  );
}
