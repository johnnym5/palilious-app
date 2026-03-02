'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddUserDialog } from '@/components/team/AddUserDialog';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function TeamPage() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const canManageUsers = userProfile?.role === 'HR' || userProfile?.role === 'MD';

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('fullName'));
  }, [firestore]);

  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'ONLINE': return 'default';
      case 'ON_LEAVE': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground">Browse and manage team members.</p>
        </div>
        {canManageUsers && (
          <AddUserDialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <Button onClick={() => setIsAddUserOpen(true)}>
              <PlusCircle className="mr-2" />
              Add New Staff
            </Button>
          </AddUserDialog>
        )}
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Staff</CardTitle>
            <CardDescription>A list of all registered users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usersLoading && Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        </TableRow>
                    ))}
                    {users?.map((staff) => (
                    <TableRow key={staff.id}>
                        <TableCell>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={staff.avatarURL} alt={staff.fullName} />
                                <AvatarFallback>{staff.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{staff.fullName}</p>
                                <p className="text-sm text-muted-foreground">{staff.email}</p>
                            </div>
                        </div>
                        </TableCell>
                        <TableCell>{staff.role}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(staff.status)}>{staff.status || 'OFFLINE'}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(staff.joinedDate), 'PPP')}</TableCell>
                    </TableRow>
                    ))}
                    {!usersLoading && users?.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No staff members found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
