"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, ActivityEntry, Permissions, Notification, Workbook, Sheet, TaskPriority } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn, sanitizeInput } from "@/lib/utils";
import { format, parse } from "date-fns";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3"]),
  dueDate: z.string().optional().refine((val) => {
    if (!val) return true; // Allow empty string
    try {
      const parsedDate = parse(val, 'dd/MM/yyyy', new Date());
      // Check if the parsed date is valid and the year is reasonable
      return !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900;
    } catch (e) {
      return false;
    }
  }, { message: "Invalid date. Please use DD/MM/YYYY format." }),
  workbookId: z.string().optional(),
  sheetId: z.string().optional(),
});


type FormData = z.infer<typeof formSchema>;

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
      title?: string;
      description?: string;
      workbookId?: string;
      sheetId?: string;
      priority?: TaskPriority;
      dueDate?: Date;
  } | null;
  currentUserProfile: UserProfile;
  permissions: Permissions;
}

export function AssignTaskDialog({ open, onOpenChange, initialData, currentUserProfile, permissions }: AssignTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => 
    currentUserProfile ? query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const workbooksQuery = useMemoFirebase(() => 
    currentUserProfile ? query(collection(firestore, 'workbooks'), where('orgId', '==', currentUserProfile.orgId)) : null
  , [firestore, currentUserProfile]);
  const { data: workbooks, isLoading: areWorkbooksLoading } = useCollection<Workbook>(workbooksQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "LEVEL_1",
      dueDate: "",
    },
  });

  const selectedWorkbookId = form.watch('workbookId');

  const sheetsQuery = useMemoFirebase(() =>
      selectedWorkbookId ? query(collection(firestore, `workbooks/${selectedWorkbookId}/sheets`)) : null
  , [firestore, selectedWorkbookId]);
  const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);


  const handleDialogClose = () => {
    form.reset();
    onOpenChange(false);
  }

  useEffect(() => {
    if (open) {
        form.reset({
            title: initialData?.title || "",
            description: initialData?.description || "",
            priority: initialData?.priority || "LEVEL_1",
            assignedTo: undefined,
            dueDate: initialData?.dueDate ? format(initialData.dueDate, 'dd/MM/yyyy') : '',
            workbookId: initialData?.workbookId,
            sheetId: initialData?.sheetId,
        });
    }
  }, [initialData, open, form]);

  async function onSubmit(values: FormData) {
    const assigneeId = permissions.canManageStaff && values.assignedTo ? values.assignedTo : currentUserProfile.id;
    if (!firestore || !currentUserProfile || !assigneeId) return;
    
    const assignedUser = users?.find(u => u.id === assigneeId);
    if (!assignedUser) {
        toast({ variant: "destructive", title: "Error", description: "Selected user not found." });
        return;
    }

    let dueDateISO: string | null = null;
    if (values.dueDate) {
        try {
            const dateObj = parse(values.dueDate, 'dd/MM/yyyy', new Date());
            dueDateISO = dateObj.toISOString();
        } catch (e) {
            form.setError('dueDate', { type: 'manual', message: 'Invalid date format' });
            return;
        }
    }
    
    if (values.priority === 'LEVEL_3' || values.priority === 'LEVEL_2') {
        const tasksRef = collection(firestore, 'tasks');
        const q = query(
            tasksRef,
            where('assignedTo', '==', assigneeId),
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
                    description: `${assignedUser.fullName} already has a High Priority (Level 3) task. Only one is allowed.` 
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
                    description: `${assignedUser.fullName} already has two Medium Priority (Level 2) tasks. Only two are allowed.` 
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
            actorId: currentUserProfile.id,
            actorName: currentUserProfile.fullName,
            timestamp: now,
            text: `created the mission and assigned it to ${assignedUser.fullName}.`,
            fromStatus: 'N/A',
            toStatus: 'QUEUED',
        };
        
        const newTask: Omit<Task, 'id'> = {
            orgId: assignedUser.orgId,
            title: sanitizeInput(values.title),
            description: sanitizeInput(values.description),
            assignedTo: assigneeId,
            assignedToName: assignedUser.fullName,
            priority: values.priority,
            status: 'QUEUED',
            dueDate: dueDateISO,
            createdBy: currentUserProfile.id,
            activity: [initialActivity],
            createdAt: now,
            workbookId: values.workbookId || initialData?.workbookId || null,
            sheetId: values.sheetId || initialData?.sheetId || null,
            sharedWith: [],
            subTasks: [],
            type: 'STANDARD',
        };

        const taskDocRef = await addDocumentNonBlocking(collection(firestore, 'tasks'), newTask);
        
        if (taskDocRef && currentUserProfile.id !== assigneeId) {
            const notification: Omit<Notification, 'id'> = {
                orgId: currentUserProfile.orgId,
                userId: assigneeId,
                title: 'New Mission Assigned',
                description: `"${sanitizeInput(values.title)}"`,
                href: `/tasks?taskId=${taskDocRef.id}`,
                isRead: false,
                createdAt: now,
            };
            addDocumentNonBlocking(collection(firestore, 'notifications'), notification);
        }
        
        toast({ title: "Task Assigned", description: `${values.title} has been assigned to ${assignedUser.fullName}.`});
        handleDialogClose();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
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
                
                {!initialData?.workbookId && (
                     <div className="space-y-2">
                        <FormField control={form.control} name="workbookId" render={({ field }) => (
                            <FormItem><FormLabel>Attach Workbook (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger disabled={areWorkbooksLoading}><SelectValue placeholder="Select a workbook" /></SelectTrigger></FormControl>
                                <SelectContent>{workbooks?.map(wb => <SelectItem key={wb.id} value={wb.id}>{wb.title}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage /></FormItem>
                        )} />
                        {selectedWorkbookId && (
                             <FormField control={form.control} name="sheetId" render={({ field }) => (
                                <FormItem>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger disabled={areSheetsLoading}><SelectValue placeholder="Select a sheet" /></SelectTrigger></FormControl>
                                    <SelectContent>{sheets?.map(sh => <SelectItem key={sh.id} value={sh.id}>{sh.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage /></FormItem>
                            )} />
                        )}
                     </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    {permissions.canManageStaff && (
                      <FormField control={form.control} name="assignedTo" render={({ field }) => (
                          <FormItem><FormLabel>Assign To</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger disabled={areUsersLoading}><SelectValue placeholder="Select Personnel" /></SelectTrigger></FormControl>
                              <SelectContent>{users?.map(user => <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage /></FormItem>
                      )} />
                    )}
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
                    <FormItem>
                        <FormLabel>Due Date (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="DD/MM/YYYY" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {permissions.canManageStaff ? 'Assign Mission' : 'Create Mission'}
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
