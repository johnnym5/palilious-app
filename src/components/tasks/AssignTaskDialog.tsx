"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, useUser, useCollection, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, TaskUpdate } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().optional(),
  assignedTo: z.string({ required_error: "Please select a staff member." }),
  priority: z.enum(["LOW", "NORMAL", "URGENT"]),
  dueDate: z.date({ required_error: "A due date is required." }),
});

type FormData = z.infer<typeof formSchema>;

interface AssignTaskDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignTaskDialog({ children, open, onOpenChange }: AssignTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => 
    authUser ? query(collection(firestore, 'users'), where('orgId', '==', authUser.photoURL)) : null // A bit of a hack to get orgId from profile
  , [firestore, authUser]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "NORMAL",
    },
  });

  async function onSubmit(values: FormData) {
    if (!firestore || !authUser) return;
    
    const assignedUser = users?.find(u => u.id === values.assignedTo);
    if (!assignedUser) {
        toast({ variant: "destructive", title: "Error", description: "Selected user not found." });
        return;
    }

    setIsLoading(true);

    try {
        const now = new Date().toISOString();
        const firstUpdate: TaskUpdate = {
            status: 'CREATED',
            time: now,
            updatedBy: authUser.uid,
        };
        
        const newTask: Omit<Task, 'id'> = {
            orgId: assignedUser.orgId,
            title: values.title,
            description: values.description || "",
            assignedTo: values.assignedTo,
            assignedToName: assignedUser.fullName,
            priority: values.priority,
            status: 'PENDING',
            dueDate: values.dueDate.toISOString(),
            createdBy: authUser.uid,
            updates: [firstUpdate],
            createdAt: now,
        };

        await addDocumentNonBlocking(collection(firestore, 'tasks'), newTask);
        
        toast({ title: "Task Assigned", description: `${values.title} has been assigned to ${assignedUser.fullName}.`});
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign New Task</DialogTitle>
          <DialogDescription>
            Delegate a new task to a member of your team.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Finalize Q3 Report" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Add more context about the task..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="assignedTo" render={({ field }) => (
                        <FormItem><FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger disabled={areUsersLoading}><SelectValue placeholder="Select Staff" /></SelectTrigger></FormControl>
                            <SelectContent>{users?.map(user => <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="priority" render={({ field }) => (
                         <FormItem><FormLabel>Priority</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Priority" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="LOW">Low</SelectItem>
                                <SelectItem value="NORMAL">Normal</SelectItem>
                                <SelectItem value="URGENT">Urgent</SelectItem>
                            </SelectContent>
                         </Select>
                         <FormMessage /></FormItem>
                    )} />
                </div>
                 <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date() || date < new Date("1900-01-01")} initialFocus />
                            </PopoverContent>
                        </Popover>
                    <FormMessage /></FormItem>
                 )} />

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Assign Task
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
