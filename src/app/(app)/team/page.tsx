'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { collection, doc, query, where } from 'firebase/firestore';
import { AddUserDialog } from '@/components/team/AddUserDialog';
import { EditUserDialog } from '@/components/team/EditUserDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { usePermissions } from '@/hooks/usePermissions';
import { useSearchParams } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


export default function TeamPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isAddUserOpen, setAddUserOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const { isSuperAdmin } = useSuperAdmin();
  const impersonatedOrgId = searchParams.get('orgId');

  const userProfileRef = useMemoFirebase(
    () => (authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  
  const usersQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      // Super Admin viewing a specific org from URL
      if (isSuperAdmin && impersonatedOrgId) {
        return query(collection(firestore, 'users'), where('orgId', '==', impersonatedOrgId));
      }
      // Super Admin on team page without specific org (shows all)
      if (isSuperAdmin) {
        return collection(firestore, 'users');
      }
      // Regular user viewing their own org
      if (userProfile?.orgId) {
        return query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId));
      }
      return null;
    },
    [firestore, userProfile, isSuperAdmin, impersonatedOrgId]
  );
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const showOrgIdColumn = isSuperAdmin && !impersonatedOrgId;

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    const userRef = doc(firestore, 'users', userToDelete.id);
    deleteDocumentNonBlocking(userRef);
    toast({
      title: 'User Deleted',
      description: `${userToDelete.fullName} has been removed from the system. Note: Their authentication record may persist.`,
    });
    setUserToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground">Browse and manage team members.</p>
        </div>
        {permissions.canManageStaff && (
          <AddUserDialog open={isAddUserOpen} onOpenChange={setAddUserOpen}>
            <Button onClick={() => setAddUserOpen(true)}>
              <PlusCircle className="mr-2" />
              Add New Staff
            </Button>
          </AddUserDialog>
        )}
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Staff</CardTitle>
            <CardDescription>A list of all registered users in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      {showOrgIdColumn && <TableHead>Organization ID</TableHead>}
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {areUsersLoading && (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-8 w-48" /></TableCell>
                           {showOrgIdColumn && <TableCell><Skeleton className="h-8 w-32" /></TableCell>}
                          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                           <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    )}
                    {!areUsersLoading && users?.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatarURL} alt={user.fullName} />
                              <AvatarFallback>{user.fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        {showOrgIdColumn && <TableCell><p className="text-xs text-muted-foreground font-mono">{user.orgId}</p></TableCell>}
                        <TableCell><Badge variant="secondary">{user.position}</Badge></TableCell>
                        <TableCell><Badge variant={user.status === 'ONLINE' ? 'default' : 'outline'}>{user.status}</Badge></TableCell>
                        <TableCell>{format(new Date(user.joinedDate), "PPP")}</TableCell>
                        <TableCell className="text-right">
                          {permissions.canManageStaff && user.id !== authUser?.uid && (
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setUserToEdit(user)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive" onClick={() => setUserToDelete(user)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!areUsersLoading && users?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={showOrgIdColumn ? 6 : 5} className="h-24 text-center">
                            No staff members found.
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      {userToEdit && (
        <EditUserDialog
            userToEdit={userToEdit}
            open={!!userToEdit}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setUserToEdit(null);
                }
            }}
        />
      )}
      
      {userToDelete && (
        <AlertDialog
            open={!!userToDelete}
            onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the user's profile
                        for <span className="font-semibold text-foreground">{userToDelete.fullName}</span> from the database.
                        It will NOT delete their authentication record.
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
    </div>
  );
}
