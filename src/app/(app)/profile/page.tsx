'use client';

import { useUser, useDoc, useFirestore, useAuth, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { usePermissions, Permissions } from '@/hooks/usePermissions';
import { Switch } from '@/components/ui/switch';

const profileFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

function ProfileUpdateForm({ userProfile, permissions }: { userProfile: UserProfile, permissions: Permissions }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            fullName: userProfile.fullName,
            username: userProfile.username,
        }
    });

    const canEdit = permissions.canEditOwnProfile;

    const onSubmit = (values: z.infer<typeof profileFormSchema>) => {
        if (!canEdit) return;
        setIsSubmitting(true);
        const userRef = doc(firestore, 'users', userProfile.id);
        updateDocumentNonBlocking(userRef, {
            fullName: values.fullName,
            username: values.username.toLowerCase(),
        });
        toast({ title: "Profile Updated", description: "Your changes have been saved." });
        setIsSubmitting(false);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} disabled={!canEdit} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl><Input {...field} disabled={!canEdit} /></FormControl>
                        <FormDescription>This will be used for logging in.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormItem>
                    <FormLabel>Email</FormLabel>
                    <Input disabled value={userProfile.email} />
                    <FormDescription>Email address cannot be changed.</FormDescription>
                </FormItem>
                {canEdit && (
                  <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="animate-spin" />}
                      Save Changes
                  </Button>
                )}
            </form>
        </Form>
    )
}

function PasswordChangeForm() {
    const auth = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof passwordFormSchema>>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
    });

    const onSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
        setIsSubmitting(true);
        const user = auth.currentUser;

        if (!user || !user.email) {
            toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
            setIsSubmitting(false);
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, values.newPassword);
            toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
            form.reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="currentPassword" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    Change Password
                </Button>
            </form>
        </Form>
    )
}

function PreferencesForm({ userProfile }: { userProfile: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleNotificationChange = (key: 'requisitionUpdates' | 'taskAssignments' | 'announcements', value: boolean) => {
        const userRef = doc(firestore, 'users', userProfile.id);
        const updatePath = `notificationPreferences.${key}`;
        
        updateDocumentNonBlocking(userRef, {
            [updatePath]: value
        });

        toast({ title: "Settings Saved", description: "Your notification preferences have been updated." });
    };

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Notifications</h3>
                <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-row items-center justify-between">
                        <Label htmlFor="requisition-updates" className="flex flex-col space-y-1">
                            <span>Requisition Updates</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Get notified about status changes to your requisitions.
                            </span>
                        </Label>
                        <Switch 
                            id="requisition-updates"
                            checked={userProfile.notificationPreferences?.requisitionUpdates ?? false}
                            onCheckedChange={(checked) => handleNotificationChange('requisitionUpdates', checked)}
                        />
                    </div>
                     <div className="flex flex-row items-center justify-between">
                        <Label htmlFor="task-assignments" className="flex flex-col space-y-1">
                            <span>Task Assignments</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Get notified when a new task is assigned to you.
                            </span>
                        </Label>
                        <Switch 
                            id="task-assignments" 
                            checked={userProfile.notificationPreferences?.taskAssignments ?? false}
                            onCheckedChange={(checked) => handleNotificationChange('taskAssignments', checked)}
                        />
                    </div>
                     <div className="flex flex-row items-center justify-between">
                        <Label htmlFor="announcements" className="flex flex-col space-y-1">
                            <span>New Announcements</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Get notified when your organization posts an announcement.
                            </span>
                        </Label>
                        <Switch 
                            id="announcements" 
                            checked={userProfile.notificationPreferences?.announcements ?? false}
                            onCheckedChange={(checked) => handleNotificationChange('announcements', checked)}
                        />
                    </div>
                </div>
            </div>
             <div className="space-y-4">
                <h3 className="text-lg font-medium">Appearance</h3>
                 <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-row items-center justify-between">
                        <Label htmlFor="theme" className="flex flex-col space-y-1">
                            <span>Theme</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Change the application theme in the top right corner.
                            </span>
                        </Label>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ProfilePage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  
  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-6">
        {isProfileLoading ? (
            <Skeleton className="h-24 w-24 rounded-full" />
        ) : (
            <Avatar className="h-24 w-24 border-2 border-primary">
                
                <AvatarFallback className="text-3xl">{userProfile?.fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            </Avatar>
        )}
        <div className='pt-2'>
            {isProfileLoading ? (
                <>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-5 w-32" />
                </>
            ) : (
                <>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">{userProfile?.fullName}</h1>
                    <p className="text-lg text-muted-foreground">{userProfile?.position}</p>
                </>
            )}
        </div>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className='grid w-full grid-cols-3 max-w-lg'>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Public Profile</CardTitle>
              <CardDescription>This information may be visible to others in your organization.</CardDescription>
            </CardHeader>
            <CardContent>
                {isProfileLoading ? <Skeleton className="h-64 w-full" /> : userProfile && <ProfileUpdateForm userProfile={userProfile} permissions={permissions} />}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security">
           <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password here. After saving, you might be logged out.</CardDescription>
            </CardHeader>
            <CardContent>
               <PasswordChangeForm />
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="preferences">
           <Card>
            <CardHeader>
              <CardTitle>My Preferences</CardTitle>
              <CardDescription>Customize your Palilious experience.</CardDescription>
            </CardHeader>
            <CardContent>
               {isProfileLoading ? (
                    <div className="space-y-8">
                         <Skeleton className="h-24 w-full" />
                         <Skeleton className="h-12 w-full" />
                    </div>
                ): userProfile ? (
                    <PreferencesForm userProfile={userProfile} />
                ) : (
                    <p className="text-muted-foreground">Could not load user settings.</p>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
