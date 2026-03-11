"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking, useUser, useAuth } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { sendPasswordResetEmail } from "firebase/auth";

const formSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  phoneNumber: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

export function ProfileDialog({ open, onOpenChange, userProfile }: ProfileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: userProfile.fullName,
      phoneNumber: userProfile.phoneNumber || "",
    },
  });
  
  useEffect(() => {
    if(userProfile){
        form.reset({
          fullName: userProfile.fullName,
          phoneNumber: userProfile.phoneNumber || "",
        })
    }
  }, [userProfile, form]);

  async function onSubmit(values: FormData) {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDocumentNonBlocking(userRef, {
        fullName: sanitizeInput(values.fullName),
        phoneNumber: sanitizeInput(values.phoneNumber) || null,
      });

      toast({
        title: "Profile Updated",
        description: "Your information has been updated.",
      });

      onOpenChange(false);
    } catch (error: any) {
      if (error.code !== 'permission-denied') {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePasswordReset = async () => {
    if (!auth || !userProfile.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send reset email. User email not found.' });
      return;
    }

    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true,
    };

    try {
      await sendPasswordResetEmail(auth, userProfile.email, actionCodeSettings);
      toast({
        title: 'Password Reset Email Sent',
        description: `An email has been sent to ${userProfile.email} with instructions to reset your password.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Email',
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
          <DialogDescription>
            View and update your personal information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                    <Input value={userProfile.username} disabled />
                </FormControl>
             </FormItem>
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input value={userProfile.email} disabled />
                </FormControl>
             </FormItem>
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                    <Input value={userProfile.position} disabled />
                </FormControl>
             </FormItem>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
        <Separator className="my-4" />
        <div className="space-y-2">
            <h4 className="text-sm font-medium">Security</h4>
            <Button variant="outline" className="w-full" onClick={handlePasswordReset}>
                Send Password Reset Email
            </Button>
            <p className="text-xs text-muted-foreground text-center">You will receive a secure link to change your password.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
