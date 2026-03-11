"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PREDEFINED_DEPARTMENTS, ROLES_BY_DEPARTMENT } from "@/lib/roles-and-departments";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  position: z.string().min(1, "Position is required."),
  departmentName: z.string({ required_error: "Department is required." }),
});

type FormData = z.infer<typeof formSchema>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: UserProfile;
}

export function EditUserDialog({ open, onOpenChange, userToEdit }: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const isInitialRender = useRef(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const selectedDepartment = form.watch('departmentName');

  useEffect(() => {
    if (userToEdit) {
      form.reset({
        username: userToEdit.username,
        position: userToEdit.position,
        departmentName: userToEdit.departmentName,
      });
      isInitialRender.current = true; // Reset for next time dialog opens
    }
  }, [userToEdit, form]);
  
  useEffect(() => {
    if (isInitialRender.current) {
        isInitialRender.current = false;
        return;
    }
    form.resetField('position');
  }, [selectedDepartment, form]);

  const rolesForSelectedDepartment = useMemo(() => {
    if (!selectedDepartment) return [];
    const departmentRoles = ROLES_BY_DEPARTMENT[selectedDepartment as keyof typeof ROLES_BY_DEPARTMENT] || [];
    
    // Always include "Staff" as a generic option
    const rolesToShow = [...new Set(['Staff', ...departmentRoles])];
    
    // Ensure the user's current position is in the list, especially for roles like 'Organization Administrator'
    if (userToEdit && !rolesToShow.includes(userToEdit.position)) {
        rolesToShow.push(userToEdit.position);
    }
    
    return rolesToShow;
  }, [selectedDepartment, userToEdit]);


  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
      const userRef = doc(firestore, 'users', userToEdit.id);
      await updateDocumentNonBlocking(userRef, {
        username: sanitizeInput(values.username.toLowerCase()),
        position: values.position,
        departmentName: values.departmentName,
      });

      toast({
        title: "User Updated",
        description: `${userToEdit.fullName}'s profile has been updated.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
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
          <DialogTitle>Edit User: {userToEdit.fullName}</DialogTitle>
          <DialogDescription>Update the user's role and department.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl><Input placeholder="e.g., jdoe" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
             <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input value={userToEdit.email} disabled /></FormControl>
                <FormDescription className="text-xs">User email cannot be changed from the admin console for security reasons.</FormDescription>
             </FormItem>
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
            <FormField control={form.control} name="position" render={({ field }) => (
              <FormItem><FormLabel>Position</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={userToEdit.position === 'Organization Administrator' || !selectedDepartment}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {rolesForSelectedDepartment.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                  </SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )}/>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
