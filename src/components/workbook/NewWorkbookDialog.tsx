"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Workbook, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewWorkbookDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

export function NewWorkbookDialog({ children, open, onOpenChange, userProfile }: NewWorkbookDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  async function onSubmit(values: FormData) {
    if (!firestore || !userProfile) {
        toast({ variant: "destructive", title: "Error", description: "Could not find user profile." });
        return;
    }
    setIsLoading(true);

    try {
        const now = new Date().toISOString();
        const newWorkbook: Omit<Workbook, 'id'> = {
            orgId: userProfile.orgId,
            title: values.title,
            description: values.description,
            createdBy: userProfile.id,
            creatorName: userProfile.fullName,
            createdAt: now,
        };

        await addDocumentNonBlocking(collection(firestore, 'workbooks'), newWorkbook);

        toast({
            title: "Workbook Created",
            description: `"${values.title}" has been successfully created.`,
        });

        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        if (error.code !== 'permission-denied') {
            toast({
                variant: "destructive",
                title: "Creation Failed",
                description: error.message || "An unexpected error occurred.",
            });
        }
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Workbook</DialogTitle>
          <DialogDescription>
            A workbook is a container for your sheets and data.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input placeholder="e.g., Q4 Marketing Plan" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="What is this workbook for?" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Workbook
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
