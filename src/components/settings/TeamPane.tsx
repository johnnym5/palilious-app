"use client";

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Edit, Loader2, KeyRound } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { InviteUserDialog } from './InviteUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { sendPasswordResetEmail } from 'firebase/auth';


interface TeamPaneProps {
    currentUserProfile: UserProfile;
}

export function TeamPane({ currentUserProfile }: TeamPaneProps) {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [isResetting, setIsResetting] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const usersQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId)) : null
    , [firestore, currentUserProfile.orgId]);

    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);
    
    // Admins cannot be deleted
    const canBeDeleted = (user: UserProfile) => {
        return user.position !== "Organization Administrator" && user.id !== currentUserProfile.id;
    }
    
    const handleDeleteUser = async () => {
        if (!userToDelete || !firestore) return;
        
        setIsDeleting(true);
        try {
            // STEP 1 (BACKEND SIMULATION): Delete from Firebase Authentication
            // This action cannot be done safely from the client-side. It requires a backend
            // environment (like a Cloud Function) with the Firebase Admin SDK.
            // We are SIMULATING this step here. In a real app, a developer would
            // replace this console log with a call to their backend function.
            console.warn(`[SIMULATION] Deleting user from Firebase Auth: ${userToDelete.email} (${userToDelete.id}). Implement a backend function for this.`);

            // STEP 2 (CLIENT): Delete user profile from Firestore Database
            await deleteDoc(doc(firestore, 'users', userToDelete.id));

            toast({
                title: 'User Deleted',
                description: `${userToDelete.fullName} has been permanently removed from the application.`,
            });
            setUserToDelete(null);
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: `Could not delete user from database. Error: ${error.message}`,
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePasswordReset = async (user: UserProfile) => {
        if (!auth) {
            toast({ variant: 'destructive', title: 'Error', description: 'Authentication service is not available.' });
            return;
        }
        setIsResetting(user.id);
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({
                title: 'Password Reset Email Sent',
                description: `An email has been sent to ${user.email} with instructions.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to Send Reset Email',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsResetting(null);
        }
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
                                    <div className="flex items-center justify-end gap-2 flex-wrap">
                                        <Button variant="outline" size="sm" onClick={() => setUserToEdit(user)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Button>
                                         <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePasswordReset(user)}
                                            disabled={isResetting === user.id}
                                        >
                                            {isResetting === user.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <KeyRound className="mr-2 h-4 w-4" />
                                            )}
                                            Reset Pass
                                        </Button>
                                        {canBeDeleted(user) && (
                                            <Button variant="destructive" size="sm" onClick={() => setUserToDelete(user)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
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
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete {userToDelete.fullName}'s profile from the database and simulate the deletion of their authentication account. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete User
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    )
}
