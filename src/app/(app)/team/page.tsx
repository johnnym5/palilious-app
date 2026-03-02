'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
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


export default function TeamPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const [isAddUserOpen, setAddUserOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const { isSuperAdmin } = useSuperAdmin();

  const userProfileRef = useMemoFirebase(
    () => (authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  
  const usersQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      if (isSuperAdmin) {
        return collection(firestore, 'users');
      }
      if (userProfile?.orgId) {
        return query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId));
      }
      return null;
    },
    [firestore, userProfile, isSuperAdmin]
  );
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

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
                      {isSuperAdmin && <TableHead>Organization ID</TableHead>}
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
                           {isSuperAdmin && <TableCell><Skeleton className="h-8 w-32" /></TableCell>}
                          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                           <TableCell><Skeleton className="h-8 w-16" /></TableCell>
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
                        {isSuperAdmin && <TableCell><p className="text-xs text-muted-foreground font-mono">{user.orgId}</p></TableCell>}
                        <TableCell><Badge variant="secondary">{user.position}</Badge></TableCell>
                        <TableCell><Badge variant={user.status === 'ONLINE' ? 'default' : 'outline'}>{user.status}</Badge></TableCell>
                        <TableCell>{format(new Date(user.joinedDate), "PPP")}</TableCell>
                        <TableCell className="text-right">
                          {permissions.canManageStaff && user.id !== authUser?.uid && (
                              <Button variant="ghost" size="icon" onClick={() => setUserToEdit(user)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!areUsersLoading && users?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-24 text-center">
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
    </div>
  );
}
