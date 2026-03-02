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
import { useFirestore, useUser, useDoc, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Requisition, UserProfile, ActivityEntry } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useSystemConfig } from "@/hooks/useSystemConfig";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  amount: z.coerce.number().min(1, { message: "Amount must be greater than 0." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
});

type FormData = z.infer<typeof formSchema>;

interface NewRequisitionDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function NewRequisitionDialog({ children, open, onOpenChange, userProfile }: NewRequisitionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { config: systemConfig } = useSystemConfig(userProfile);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: 0,
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
        const reqsCollection = collection(firestore, 'requisitions');
        
        // This client-side count has a potential race condition but is acceptable for this MVP.
        const q = query(reqsCollection, where('orgId', '==', userProfile.orgId));
        const orgReqsSnapshot = await getDocs(q);
        const newSerialNo = `REQ-${String(orgReqsSnapshot.size + 1).padStart(4, '0')}`;

        const now = new Date().toISOString();
        const nextStatus = 'PENDING_HR';

        const initialActivity: ActivityEntry = {
            type: 'LOG',
            actorId: userProfile.id,
            actorName: userProfile.fullName,
            actorAvatarUrl: userProfile.avatarURL,
            timestamp: now,
            text: `created the requisition and sent for HR approval.`,
            fromStatus: 'N/A',
            toStatus: nextStatus,
        };

        const newRequisition: Omit<Requisition, 'id'> = {
            serialNo: newSerialNo,
            orgId: userProfile.orgId,
            createdBy: userProfile.id,
            creatorName: userProfile.fullName,
            title: values.title,
            amount: values.amount,
            description: values.description,
            status: nextStatus,
            createdAt: now,
            activity: [initialActivity],
        };

        await addDocumentNonBlocking(reqsCollection, newRequisition);

        toast({
            title: "Requisition Submitted",
            description: `Your request ${newSerialNo} is now pending HR approval.`,
        });

        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        console.error("Error creating requisition:", error);
        if (error.code !== 'permission-denied') {
            toast({
                variant: "destructive",
                title: "Submission Failed",
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
          <DialogTitle>New Requisition</DialogTitle>
          <DialogDescription>
            Fill out the form below to submit a new financial request.
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
                        <FormControl><Input placeholder="e.g., New Office Chairs" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount ({systemConfig?.currency_symbol || '$'})</FormLabel>
                        <FormControl><Input type="number" placeholder="2500.00" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description & Justification</FormLabel>
                        <FormControl><Textarea placeholder="Detailed reason for this expenditure..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit for Approval
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
