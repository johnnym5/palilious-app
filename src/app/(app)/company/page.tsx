'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Organization, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { SystemConfigForm } from '@/components/company/SystemConfigForm';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DepartmentManager } from '@/components/team/DepartmentManager';

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

export default function CompanySettingsPage() {
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
  
  // Use the refactored hook with the target orgId
  const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(targetOrgId);
  
  const isLoading = isProfileLoading || isOrgLoading || isConfigLoading;

  if (!isProfileLoading && !permissions.canManageCompany) {
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
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Company Settings</h1>
            <p className="text-muted-foreground">Manage your organization's details and settings.</p>
        </div>
        
        {userProfile && <DepartmentManager userProfile={userProfile} />}

        <div className="grid gap-6 lg:grid-cols-2 items-start">
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
    </div>
  );
}
