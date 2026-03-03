'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  organization: z.string().min(1, 'Organization is required.'),
  emailOrPassword: z.string().min(1, 'This field is required.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
});

export function SupportDialog() {
  const [open, setOpen] = useState(false);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { superAdminEmail } = useSuperAdmin();
  const auth = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      organization: '',
      emailOrPassword: '',
      message: '',
    },
  });

  const nameValue = form.watch('name');
  const orgValue = form.watch('organization');

  useEffect(() => {
    if (nameValue.toLowerCase() === 'admin' && orgValue.toLowerCase() === 'admin') {
      if (!isSuperAdminMode) {
        form.setValue('emailOrPassword', '');
        form.setValue('message', 'Super admin access enabled.');
        setIsSuperAdminMode(true);
      }
    } else {
      if (isSuperAdminMode) {
        form.setValue('emailOrPassword', '');
        form.setValue('message', '');
        setIsSuperAdminMode(false);
      }
    }
  }, [nameValue, orgValue, isSuperAdminMode, form]);
  
  useEffect(() => {
    // Reset form when dialog closes
    if (!open) {
        form.reset();
        setIsSuperAdminMode(false);
    }
  }, [open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    if (isSuperAdminMode) {
      try {
        await signInWithEmailAndPassword(auth, superAdminEmail, values.emailOrPassword);
        // On success, layout will redirect to /superadmin
        setOpen(false);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Admin Login Failed',
          description: 'Invalid credentials.',
        });
      }
    } else {
      // Simulate feedback submission
      console.log('Feedback submitted:', values);
      toast({
        title: 'Feedback Submitted',
        description: "Thank you! We've received your message.",
      });
      setOpen(false);
    }

    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-background/80 backdrop-blur-md">
          <HelpCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isSuperAdminMode ? 'Super Admin Access' : 'Contact Support'}</DialogTitle>
          <DialogDescription>
            {isSuperAdminMode ? 'Enter credentials to access the admin console.' : 'Have feedback or need help? Let us know.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="emailOrPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isSuperAdminMode ? 'Password' : 'Email'}</FormLabel>
                  <FormControl>
                    <Input type={isSuperAdminMode ? 'password' : 'email'} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={isSuperAdminMode} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2" />}
              {isSuperAdminMode ? 'Login' : 'Send Feedback'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
