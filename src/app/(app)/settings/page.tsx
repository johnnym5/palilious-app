'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

function SettingsForm({ userProfile }: { userProfile: UserProfile }) {
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
                                The application is currently in dark mode.
                            </span>
                        </Label>
                        <p className="text-sm text-muted-foreground">Dark</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function SettingsPage() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null
    , [firestore, authUser]);
  
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    return (
      <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account and application preferences.</p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your ControlFlow experience.</CardDescription>
            </CardHeader>
            <CardContent>
                {isProfileLoading ? (
                    <div className="space-y-8">
                         <Skeleton className="h-24 w-full" />
                         <Skeleton className="h-12 w-full" />
                    </div>
                ): userProfile ? (
                    <SettingsForm userProfile={userProfile} />
                ) : (
                    <p className="text-muted-foreground">Could not load user settings.</p>
                )}
            </CardContent>
        </Card>
      </div>
    );
}
