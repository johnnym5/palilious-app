'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { Organization, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { SystemConfigForm } from '@/components/company/SystemConfigForm';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DepartmentManager } from '@/components/team/DepartmentManager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddUserDialog } from '@/components/team/AddUserDialog';
import { EditUserDialog } from '@/components/team/EditUserDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const orgFormSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
});

function CompanySettingsForm({ organization }: { organization: Organization }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof orgFormSchema>>({
        resolver: zodResolver(orgFormSchema),
        defaultValues: {
            name: organization.name.charAt(0).toUpperCase() + organization.name.slice(1),
        }
    });
    
    useEffect(() => {
        form.reset({ name: organization.name.charAt(0).toUpperCase() + organization.name.slice(1) });
    }, [organization, form]);

    const onSubmit = (values: z.infer<typeof orgFormSchema>) => {
        setIsSubmitting(true);
        const orgRef = doc(firestore, 'organizations', organization.id);
        updateDocumentNonBlocking(orgRef, {
            name: values.name.toLowerCase(),
        });
        toast({ title: "Organization Updated", description: "The organization name has been changed." });
        setIsSubmitting(false);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    Save Changes
                </Button>
            </form>
        </Form>
    )
}

function StaffDirectory() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>Browse and manage team members.</CardDescription>
        </div>
        {permissions.canManageStaff && (
          <AddUserDialog open={isAddUserOpen} onOpenChange={setAddUserOpen}>
            <Button onClick={() => setAddUserOpen(true)}>
              <PlusCircle className="mr-2" />
              Add New Staff
            </Button>
          </AddUserDialog>
        )}
      </CardHeader>
      <CardContent>
           <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      {showOrgIdColumn && <TableHead>Organization ID</TableHead>}
                      <TableHead>Department</TableHead>
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
                    {!areUsersLoading && users?.map(user => {
                      return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{user.fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        {showOrgIdColumn && <TableCell><p className="text-xs text-muted-foreground font-mono">{user.orgId}</p></TableCell>}
                        <TableCell>{user.departmentName || '—'}</TableCell>
                        <TableCell><Badge variant="secondary">{user.position}</Badge></TableCell>
                        <TableCell>
                            {user.status === 'ONLINE' ? (
                                <Badge variant={'default'}>{user.status}</Badge>
                            ) : (
                                user.lastSeen ? (
                                    <span className="text-xs text-muted-foreground" title={new Date(user.lastSeen).toLocaleString()}>
                                        {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
                                    </span>
                                ) : (
                                    <Badge variant={'outline'}>{user.status || 'OFFLINE'}</Badge>
                                )
                            )}
                        </TableCell>
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
                    )})}
                    {!areUsersLoading && users?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={showOrgIdColumn ? 7 : 6} className="h-24 text-center">
                            No staff members found.
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
        
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
    </Card>
  )
}

function SettingsPageContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSuperAdmin } = useSuperAdmin();
  const impersonatedOrgId = searchParams.get('orgId');

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const permissions = usePermissions(userProfile);

  // Determine the target orgId based on user role and URL params
  const targetOrgId = (isSuperAdmin && impersonatedOrgId) ? impersonatedOrgId : userProfile?.orgId;

  const orgRef = useMemoFirebase(() => 
    targetOrgId ? doc(firestore, "organizations", targetOrgId) : null,
  [firestore, targetOrgId]);
  const { data: organization, isLoading: isOrgLoading } = useDoc<Organization>(orgRef);
  
  const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(targetOrgId);
  
  const isLoading = isProfileLoading || isOrgLoading || isConfigLoading;

  if (!isProfileLoading && !permissions.canManageStaff) {
      return (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
              <p className="text-muted-foreground mt-2">You do not have the required permissions to view this page.</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-6">Return to Dashboard</Button>
            </div>
      )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="space-y-6">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6 p-6">
       <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Organization Settings</h1>
            <p className="text-muted-foreground">Manage your organization's details, staff, and system-wide settings.</p>
        </div>

        <StaffDirectory />
        
        {userProfile && <DepartmentManager userProfile={userProfile} />}

        {permissions.canManageCompany && (
          <div className="space-y-6">
              <Card>
                  <CardHeader>
                  <CardTitle>Organization Profile</CardTitle>
                  <CardDescription>Manage your organization's public name.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {organization ? <CompanySettingsForm organization={organization} /> : <p>Organization not found.</p>}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>Manage global feature toggles and operational settings.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {systemConfig ? (
                          <ScrollArea className="h-96 pr-6">
                              <SystemConfigForm systemConfig={systemConfig} />
                          </ScrollArea>
                      ) : <p>System configuration not found.</p>}
                  </CardContent>
              </Card>
          </div>
        )}
    </div>
  );
}


interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <VisuallyHidden>
            <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>Manage your organization's details, staff, and system-wide settings.</DialogDescription>
            </DialogHeader>
        </VisuallyHidden>
        <ScrollArea className="flex-1">
            <SettingsPageContent />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
