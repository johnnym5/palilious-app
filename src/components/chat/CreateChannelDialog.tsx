"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Users } from "lucide-react";
import { useState } from "react";
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Chat, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(3, { message: "Channel name must be at least 3 characters." }),
  participants: z.array(z.string()).min(1, { message: "You must select at least one member." }),
});

type FormData = z.infer<typeof formSchema>;

interface CreateChannelDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
}

export function CreateChannelDialog({ children, open, onOpenChange, currentUserProfile }: CreateChannelDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => 
    query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId))
  , [firestore, currentUserProfile.orgId]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      participants: [],
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
    }
    onOpenChange(isOpen);
  }

  async function onSubmit(data: FormData) {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const allParticipantIds = [...new Set([currentUserProfile.id, ...data.participants])];
    const participantProfiles = allUsers?.reduce((acc, user) => {
        if (allParticipantIds.includes(user.id)) {
            acc[user.id] = { fullName: user.fullName, avatarURL: user.avatarURL || "" };
        }
        return acc;
    }, {} as Chat['participantProfiles']) || {};

    try {
        const newChannel: Omit<Chat, 'id'> = {
            orgId: currentUserProfile.orgId,
            type: 'CHANNEL',
            name: sanitizeInput(data.name),
            createdBy: currentUserProfile.id,
            participants: allParticipantIds,
            participantProfiles,
            updatedAt: new Date().toISOString(),
        };

        await addDocumentNonBlocking(collection(firestore, 'chats'), newChannel);
        
        toast({ title: "Channel Created", description: `The channel "${data.name}" is ready.`});
        handleOpenChange(false);
    } catch (error: any) {
         toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Start a group conversation with selected team members.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Channel Name</FormLabel>
                        <FormControl><Input placeholder="# project-alpha" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="participants"
                    render={() => (
                    <FormItem>
                        <FormLabel>Invite Members</FormLabel>
                        <ScrollArea className="h-48 border rounded-md">
                           <div className="p-2">
                            {areUsersLoading && <Loader2 className="animate-spin" />}
                            {!areUsersLoading && allUsers?.filter(u => u.id !== currentUserProfile.id).map((user) => (
                                <FormField
                                    key={user.id}
                                    control={form.control}
                                    name="participants"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded hover:bg-secondary">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(user.id)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...field.value, user.id])
                                                        : field.onChange(field.value?.filter((value) => value !== user.id))
                                                    }}
                                                />
                                            </FormControl>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.avatarURL} />
                                                <AvatarFallback>{user.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <FormLabel className="font-normal flex-1 cursor-pointer">
                                                {user.fullName}
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                             ))}
                           </div>
                        </ScrollArea>
                         <FormMessage />
                    </FormItem>
                    )}
                />
                 <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />}
                    Create Channel
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
