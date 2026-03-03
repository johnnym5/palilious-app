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
import { useState, useEffect } from "react";
import { useFirestore, useUser, useCollection, addDocumentNonBlocking, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, ActivityEntry } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().optional(),
  assignedTo: z.string({ required_error: "Please select a staff member." }),
  priority: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3"]),
  dueDate: z.date().optional(),
  attachmentUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface AssignTaskDialogProps {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
      title: string;
      description?: string;
      attachmentUrl?: string;
  }
}

export function AssignTaskDialog({ children, open, onOpenChange, initialData }: AssignTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const usersQuery = useMemoFirebase(() => 
    userProfile ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null
  , [firestore, userProfile]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "LEVEL_1",
      attachmentUrl: "",
    },
  });

    useEffect(() => {
        if (open) {
            form.reset({
                title: initialData?.title || "",
                description: initialData?.description || "",
                priority: "LEVEL_1",
                attachmentUrl: initialData?.attachmentUrl || "",
                assignedTo: undefined,
                dueDate: undefined,
            });
        }
  }, [initialData, open, form]);


  async function onSubmit(values: FormData) {
    if (!firestore || !authUser || !userProfile) return;
    
    const assignedUser = users?.find(u => u.id === values.assignedTo);
    if (!assignedUser) {
        toast({ variant: "destructive", title: "Error", description: "Selected user not found." });
        return;
    }
    
    if (values.priority === 'LEVEL_3' || values.priority === 'LEVEL_2') {
        const tasksRef = collection(firestore, 'tasks');
        const q = query(
            tasksRef,
            where('assignedTo', '==', values.assignedTo),
            where('status', 'in', ['QUEUED', 'ACTIVE', 'AWAITING_REVIEW'])
        );
        const existingTasksSnapshot = await getDocs(q);
        const existingTasks = existingTasksSnapshot.docs.map(doc => doc.data() as Task);

        if (values.priority === 'LEVEL_3') {
            const level3Tasks = existingTasks.filter(t => t.priority === 'LEVEL_3');
            if (level3Tasks.length > 0) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Assignment Failed', 
                    description: `${'\'\'\'\'\'\'\'\'\'\''}${assignedUser.fullName} already has a High Priority (Level 3) task. Only one is allowed.` 
                });
                return;
            }
        }

        if (values.priority === 'LEVEL_2') {
            const level2Tasks = existingTasks.filter(t => t.priority === 'LEVEL_2');
            if (level2Tasks.length >= 2) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Assignment Failed', 
                    description: `${'\'\'\'\'\'\'\'\'\'\''}${assignedUser.fullName} already has two Medium Priority (Level 2) tasks. Only two are allowed.` 
                });
                return;
            }
        }
    }


    setIsLoading(true);

    try {
        const now = new Date().toISOString();
        const initialActivity: ActivityEntry = {
            type: 'LOG',
            actorId: authUser.uid,
            actorName: userProfile.fullName,
            actorAvatarUrl: userProfile.avatarURL,
            timestamp: now,
            text: `created the mission and assigned it to ${assignedUser.fullName}.`,
            fromStatus: 'N/A',
            toStatus: 'QUEUED',
        };
        
        const newTask: Omit<Task, 'id'> = {
            orgId: assignedUser.orgId,
            title: values.title,
            description: values.description || "",
            assignedTo: values.assignedTo,
            assignedToName: assignedUser.fullName,
            priority: values.priority,
            status: 'QUEUED',
            dueDate: values.dueDate?.toISOString(),
            createdBy: authUser.uid,
            activity: [initialActivity],
            createdAt: now,
            attachmentUrl: values.attachmentUrl,
            sharedWith: [],
            subTasks: [],
        };

        await addDocumentNonBlocking(collection(firestore, 'tasks'), newTask);
        
        toast({ title: "Task Assigned", description: `${'\'\'\'\'\'\'\'\'\'\''}${values.title} has been assigned to ${assignedUser.fullName}.`});
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
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign New Directive</DialogTitle>
          <DialogDescription>
            Delegate a new mission to a member of your team.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Finalize Q3 Report" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Add more context about the mission..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="attachmentUrl" render={({ field }) => (
                    <FormItem><FormLabel>Link to Document (Optional)</FormLabel><FormControl><Input placeholder="Paste a link to your Excel, Word, or PDF file" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="assignedTo" render={({ field }) => (
                        <FormItem><FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger disabled={areUsersLoading}><SelectValue placeholder="Select Personnel" /></SelectTrigger></FormControl>
                            <SelectContent>{users?.map(user => <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="priority" render={({ field }) => (
                         <FormItem><FormLabel>Priority</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Priority" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="LEVEL_1">Low</SelectItem>
                                <SelectItem value="LEVEL_2">Medium</SelectItem>
                                <SelectItem value="LEVEL_3">High</SelectItem>
                            </SelectContent>
                         </Select>
                         <FormMessage /></FormItem>
                    )} />
                </div>
                 <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Due Date (Optional)</FormLabel>
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
                    Assign Mission
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
