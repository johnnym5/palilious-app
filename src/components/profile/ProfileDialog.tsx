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
import { useFirestore, updateDocumentNonBlocking, useUser } from "@/firebase";
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

const formSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: userProfile.fullName,
    },
  });
  
  useEffect(() => {
    if(userProfile){
        form.reset({fullName: userProfile.fullName})
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
      });

      toast({
        title: "Profile Updated",
        description: "Your full name has been updated.",
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
      </DialogContent>
    </Dialog>
  );
}
