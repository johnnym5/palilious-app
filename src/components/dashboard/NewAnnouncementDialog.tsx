"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Megaphone } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Announcement, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters long." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters long." }),
  isPinned: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface NewAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

export function NewAnnouncementDialog({ open, onOpenChange, userProfile }: NewAnnouncementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      isPinned: false,
    },
  });

  async function onSubmit(values: FormData) {
    setIsLoading(true);

    try {
      const newAnnouncement: Omit<Announcement, 'id'> = {
        orgId: userProfile.orgId,
        title: values.title,
        content: values.content,
        isPinned: values.isPinned,
        authorId: userProfile.id,
        authorName: userProfile.fullName,
        createdAt: new Date().toISOString(),
        viewedBy: [],
      };

      await addDocumentNonBlocking(collection(firestore, 'announcements'), newAnnouncement);

      toast({
        title: "Announcement Posted",
        description: "Your announcement is now visible to the organization.",
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      if (error.code !== 'permission-denied') {
        toast({
          variant: "destructive",
          title: "Failed to post announcement",
          description: error.message || "An unexpected error occurred.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
          <DialogDescription>
            Broadcast a message to everyone in your organization.
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
                  <FormControl>
                    <Input placeholder="e.g., Office Closed on Monday" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Provide the full details of the announcement..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="isPinned"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>Pin Announcement</FormLabel>
                            <FormDescription>
                                Pinned items stay at the top and track views.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
              Post Announcement
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
