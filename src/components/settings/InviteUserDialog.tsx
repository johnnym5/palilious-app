"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, setDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PREDEFINED_ROLES, PREDEFINED_DEPARTMENTS } from "@/lib/roles-and-departments";
import { sanitizeInput } from "@/lib/utils";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Terminal } from 'lucide-react';


const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  position: z.string().min(1, "Position is required."),
  departmentName: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
}

export function InviteUserDialog({ open, onOpenChange, currentUserProfile }: InviteUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const auth = getAuth(); // We need to be careful with this
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });
  
  const handleDialogClose = () => {
    form.reset();
    onOpenChange(false);
  }

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
      // This is a tricky operation on the client, as it can interfere with the admin's session.
      // A backend function is the recommended approach. This is a client-side workaround.
      
      // We can't use the main auth instance from context as it would re-trigger auth state changes.
      // We create a temporary, secondary app instance to handle this one-off user creation.
      
      // Creating a user this way on the client is not ideal. A proper implementation would use Firebase Admin SDK
      // on a secure backend to mint a custom token or create the user directly.
      // This is a placeholder to demonstrate the UI flow.
      
      // Placeholder logic: Just create the Firestore document.
      const newUserId = doc(collection(firestore, 'users')).id; // Generate a new ID
      const userDocRef = doc(firestore, "users", newUserId);

      const newUserProfile: Omit<UserProfile, 'id'> = {
        orgId: currentUserProfile.orgId,
        email: values.email.toLowerCase(),
        username: values.email.split('@')[0].toLowerCase(), // default username
        fullName: sanitizeInput(values.fullName),
        position: values.position as UserProfile['position'],
        departmentName: values.departmentName,
        joinedDate: new Date().toISOString(),
        status: 'OFFLINE',
      };
      
      await setDocumentNonBlocking(userDocRef, newUserProfile, { merge: false });

      toast({
        title: "User Profile Created",
        description: `${values.fullName}'s profile has been added. They will not be able to log in until an administrator creates their authentication credentials.`,
      });
      
      handleDialogClose();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Add User",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Add a new member to your organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Developer Note</AlertTitle>
                <AlertDescription>
                    This form only creates the user's database record. A backend function using the Firebase Admin SDK is required to securely create their authentication account.
                </AlertDescription>
            </Alert>
            <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="position" render={({ field }) => (
                <FormItem><FormLabel>Position</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {PREDEFINED_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                        </SelectContent>
                    </Select>
                <FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="departmentName" render={({ field }) => (
                <FormItem><FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {PREDEFINED_DEPARTMENTS.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                        </SelectContent>
                    </Select>
                <FormMessage /></FormItem>
            )}/>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add User Profile"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
