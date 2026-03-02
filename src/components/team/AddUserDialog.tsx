"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPosition, UserProfile, Organization } from "@/lib/types";
import { useState, useMemo } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useFirestore, setDocumentNonBlocking, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { firebaseConfig } from "@/firebase/config";
import { doc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Calendar } from "@/components/ui/calendar";

const positions: UserPosition[] = ['Staff', 'HR Manager', 'Finance Manager', 'Managing Director', 'Organization Administrator'];

const baseSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  position: z.enum(positions as [string, ...string[]], { required_error: "Position is required." }),
  birthday: z.date().optional(),
});


interface AddUserDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ children, open, onOpenChange }: AddUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const { isSuperAdmin } = useSuperAdmin();
  
  const orgsQuery = useMemoFirebase(
    () => (isSuperAdmin ? collection(firestore, 'organizations') : null),
    [firestore, isSuperAdmin]
  );
  const { data: organizations, isLoading: areOrgsLoading } = useCollection<Organization>(orgsQuery);


  const adminProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null
  , [firestore, authUser]);
  const { data: adminProfile } = useDoc<UserProfile>(adminProfileRef);

  const formSchema = useMemo(() => {
    if (isSuperAdmin) {
      return baseSchema.extend({
        orgId: z.string({ required_error: "Organization is required." }).min(1, { message: "Organization is required." }),
      });
    }
    return baseSchema;
  }, [isSuperAdmin]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      position: "Staff",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const orgId = isSuperAdmin ? (values as { orgId: string }).orgId : adminProfile?.orgId;
    
    if (!firestore || !orgId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not determine your organization. Please try again.",
        });
        return;
    }
    setIsLoading(true);
    
    const tempAppName = `createUser-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, values.password);
      const newUser = userCredential.user;

      const userData: Omit<UserProfile, 'id' | 'username'> = {
        orgId: orgId,
        fullName: values.fullName,
        email: values.email,
        position: values.position,
        joinedDate: new Date().toISOString(),
        status: 'OFFLINE',
        avatarURL: `https://picsum.photos/seed/${newUser.uid}/48/48`,
        ...(values.birthday && { birthday: values.birthday.toISOString() }),
      };

      await updateProfile(newUser, { 
        displayName: values.fullName,
        photoURL: userData.avatarURL
      });

      const userRef = doc(firestore, "users", newUser.uid);
      const profileData: UserProfile = {
          id: newUser.uid,
          username: values.email.split('@')[0], // Generate a default username
          ...userData,
      }
      setDocumentNonBlocking(userRef, profileData, { merge: false });

      toast({
        title: "User Created Successfully",
        description: `${values.fullName} has been added to the team.`,
      });
      form.reset();
      onOpenChange(false);

    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "An error occurred while creating the user.",
      });
    } finally {
      setIsLoading(false);
      deleteApp(tempApp);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>
            Create a new account for your organization. The user will be able to log in with the email and password you set.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              {isSuperAdmin && (
                <FormField
                  control={form.control}
                  name="orgId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value as string | undefined}>
                        <FormControl>
                          <SelectTrigger disabled={areOrgsLoading}>
                            <SelectValue placeholder="Select an organization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {areOrgsLoading ? (
                             <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            organizations?.map((org) => (
                              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {positions.map((position) => (
                            <SelectItem key={position} value={position}>{position}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                      <FormLabel>Birthday</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
