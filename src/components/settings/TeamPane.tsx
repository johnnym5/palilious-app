"use client";

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '../ui/skeleton';
import { InviteUserDialog } from './InviteUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


interface TeamPaneProps {
    currentUserProfile: UserProfile;
}

export function TeamPane({ currentUserProfile }: TeamPaneProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

    const usersQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId)) : null
    , [firestore, currentUserProfile.orgId]);

    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);
    
    // Admins cannot be deleted
    const canBeDeleted = (user: UserProfile) => {
        return user.position !== "Organization Administrator" && user.id !== currentUserProfile.id;
    }
    
    const handleDeleteUser = () => {
        if (!userToDelete) return;
        
        // This is a simplification. In a real app, you would need a backend function
        // to delete the Firebase Auth user as well.
        deleteDocumentNonBlocking(doc(firestore, 'users', userToDelete.id));

        toast({
            title: 'User Deleted',
            description: `${userToDelete.fullName} has been removed from the organization.`,
        });
        setUserToDelete(null);
    };

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold font-headline">Team Members</h3>
                <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} currentUserProfile={currentUserProfile}>
                    <Button onClick={() => setIsInviteOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Invite User
                    </Button>
                </InviteUserDialog>
            </div>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 3}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && users?.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="font-medium">{user.fullName}</div>
                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                </TableCell>
                                <TableCell><Badge variant="secondary">{user.position}</Badge></TableCell>
                                <TableCell>{user.departmentName || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => setUserToEdit(user)}>Edit</DropdownMenuItem>
                                            {canBeDeleted(user) && (
                                                <DropdownMenuItem className="text-destructive" onSelect={() => setUserToDelete(user)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {userToEdit && (
                <EditUserDialog 
                    open={!!userToEdit}
                    onOpenChange={(isOpen) => !isOpen && setUserToEdit(null)}
                    userToEdit={userToEdit}
                />
            )}
            
            {userToDelete && (
                 <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will delete {userToDelete.fullName}'s profile. This action cannot be undone. You will need a backend function to also remove their auth credentials.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                                Delete User
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    )
}
