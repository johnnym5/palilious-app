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
import { useRouter } from 'next/navigation';

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
    
    // This effect ensures the form is reset if the organization data from Firestore changes
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
  
  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const permissions = usePermissions(userProfile);

  const orgRef = useMemoFirebase(() => 
    userProfile?.orgId ? doc(firestore, "organizations", userProfile.orgId) : null,
  [firestore, userProfile?.orgId]);
  const { data: organization, isLoading: isOrgLoading } = useDoc<Organization>(orgRef);
  
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

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Company Settings</h1>
            <p className="text-muted-foreground">Manage your organization's details and settings.</p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>Manage your organization's public name.</CardDescription>
        </CardHeader>
        <CardContent>
            {isOrgLoading || isProfileLoading ? <Skeleton className="h-40 w-full" /> : (organization ? <CompanySettingsForm organization={organization} /> : <p>Organization not found.</p>)}
        </CardContent>
      </Card>
    </div>
  );
}
