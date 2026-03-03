"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UserProfile, UserPosition } from "@/lib/types";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useFirestore, updateDocumentNonBlocking, useAuth } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { sendPasswordResetEmail } from "firebase/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const positions: UserPosition[] = ["Staff", "HR Manager", "Finance Manager", "Managing Director", "Organization Administrator"];

const formSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  position: z.string().min(1, { message: "Position is required." }),
});

interface EditUserDialogProps {
  userToEdit: UserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ userToEdit, open, onOpenChange }: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: userToEdit.fullName,
      position: userToEdit.position,
    },
  });

  useEffect(() => {
    if (userToEdit) {
      form.reset({
        fullName: userToEdit.fullName,
        position: userToEdit.position,
      });
    }
  }, [userToEdit, form]);

  const handlePasswordReset = async () => {
    if (!auth) return;
    try {
        await sendPasswordResetEmail(auth, userToEdit.email);
        toast({
            title: "Password Reset Email Sent",
            description: `An email has been sent to ${userToEdit.email} with instructions.`,
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Failed to Send Email",
            description: error.message,
        });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userRef = doc(firestore, "users", userToEdit.id);
      updateDocumentNonBlocking(userRef, {
        fullName: values.fullName,
        position: values.position,
      });

      toast({
        title: "User Updated",
        description: `${values.fullName}'s details have been updated.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An error occurred while updating the user.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Update the details for {userToEdit.fullName}.
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
             <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position / Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormItem>
                <FormLabel>Email</FormLabel>
                <Input disabled value={userToEdit.email} />
                <p className="text-[0.8rem] text-muted-foreground">Email address cannot be changed.</p>
             </FormItem>
            <DialogFooter className="gap-y-2">
                <Button type="button" variant="outline" onClick={handlePasswordReset}>
                    Send Password Reset
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
