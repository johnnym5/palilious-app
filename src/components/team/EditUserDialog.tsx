"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UserProfile, UserPosition, Department } from "@/lib/types";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useFirestore, updateDocumentNonBlocking, useAuth, useMemoFirebase, useCollection } from "@/firebase";
import { doc, query, collection, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { sendPasswordResetEmail } from "firebase/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";

const positions: UserPosition[] = ["Staff", "HR Manager", "Finance Manager", "Managing Director", "Organization Administrator"];

const formSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  position: z.string().min(1, { message: "Position is required." }),
  departmentId: z.string().optional(),
  canAccessRequisitions: z.boolean().optional(),
  canAccessChat: z.boolean().optional(),
  canAccessAllTasks: z.boolean().optional(),
  canAccessAllWorkbooks: z.boolean().optional(),
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

  const deptsQuery = useMemoFirebase(() => 
    query(collection(firestore, 'departments'), where('orgId', '==', userToEdit.orgId))
  , [firestore, userToEdit.orgId]);
  const { data: departments, isLoading: areDeptsLoading } = useCollection<Department>(deptsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (userToEdit) {
      form.reset({
        fullName: userToEdit.fullName,
        position: userToEdit.position,
        departmentId: userToEdit.departmentId || "__NONE__",
        canAccessRequisitions: userToEdit.customPermissions?.canAccessRequisitions,
        canAccessChat: userToEdit.customPermissions?.canAccessChat,
        canAccessAllTasks: userToEdit.customPermissions?.canAccessAllTasks,
        canAccessAllWorkbooks: userToEdit.customPermissions?.canAccessAllWorkbooks,
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
      const isNoDepartment = values.departmentId === "__NONE__";
      const selectedDepartment = isNoDepartment ? null : departments?.find(d => d.id === values.departmentId);
      
      const updateData = {
        fullName: values.fullName,
        position: values.position,
        departmentId: isNoDepartment ? null : values.departmentId,
        departmentName: selectedDepartment?.name || null,
        customPermissions: {
            canAccessRequisitions: values.canAccessRequisitions || false,
            canAccessChat: values.canAccessChat || false,
            canAccessAllTasks: values.canAccessAllTasks || false,
            canAccessAllWorkbooks: values.canAccessAllWorkbooks || false,
        }
      };

      updateDocumentNonBlocking(userRef, updateData);

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
      <DialogContent className="sm:max-w-md">
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
            <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger disabled={areDeptsLoading}>
                                <SelectValue placeholder={areDeptsLoading ? "Loading..." : "Select a department"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="__NONE__">No Department</SelectItem>
                            {departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
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

             <Separator className="my-4"/>

             <div className="space-y-2">
                <h4 className="text-sm font-medium">Module Access Overrides</h4>
                <p className="text-sm text-muted-foreground">
                    Grant or revoke access to modules, overriding the user's role. This is ignored if a module is disabled for the whole organization.
                </p>
             </div>

             <div className="space-y-4 rounded-lg border p-4">
                <FormField
                    control={form.control}
                    name="canAccessRequisitions"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                            <FormLabel>Requisitions</FormLabel>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="canAccessChat"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                            <FormLabel>Chat</FormLabel>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="canAccessAllTasks"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                                <FormLabel>View All Tasks</FormLabel>
                                <FormDescription className="text-xs">Allows user to see all tasks in the organization.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="canAccessAllWorkbooks"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                             <div className="space-y-0.5">
                                <FormLabel>View All Workbooks</FormLabel>
                                <FormDescription className="text-xs">Allows user to see all workbooks in the organization.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                 />
             </div>


            <DialogFooter className="gap-y-2 pt-4">
                <Button type="button" variant="outline" onClick={handlePasswordReset}>
                    Send Password Reset
                </Button>
                <div className="flex-1" />
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
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
