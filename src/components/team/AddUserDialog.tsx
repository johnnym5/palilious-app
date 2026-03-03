"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserProfile, Organization, UserPosition, Department } from "@/lib/types";
import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useFirestore, setDocumentNonBlocking, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { firebaseConfig } from "@/firebase/config";
import { doc, collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { PREDEFINED_DEPARTMENTS, ROLES_BY_DEPARTMENT, GENERIC_ROLES } from "@/lib/roles-and-departments";
import { sanitizeInput } from "@/lib/utils";

const baseSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  position: z.string({ required_error: "Position is required." }).min(1, 'Position is required.'),
  departmentName: z.string().optional(),
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
      username: "",
      email: "",
      password: "",
      position: undefined,
      departmentName: undefined,
    },
  });
  
  const orgIdForQuery = isSuperAdmin ? form.watch('orgId') : adminProfile?.orgId;

  const departmentsQuery = useMemoFirebase(() => 
      orgIdForQuery ? query(collection(firestore, 'departments'), where('orgId', '==', orgIdForQuery)) : null
  , [firestore, orgIdForQuery]);

  const { data: customDepartments, isLoading: areDeptsLoading } = useCollection<Department>(departmentsQuery);

  const allDepartments = useMemo(() => {
      if (areDeptsLoading) return [];
      const customDeptNames = customDepartments?.map(d => d.name) || [];
      const combined = new Set([...PREDEFINED_DEPARTMENTS, ...customDeptNames]);
      return Array.from(combined).sort();
  }, [customDepartments, areDeptsLoading]);

  const selectedDepartment = form.watch('departmentName');

  useEffect(() => {
    form.setValue('position', undefined);
  }, [selectedDepartment, form]);

  const availablePositions = useMemo(() => {
    if (!selectedDepartment || selectedDepartment === '__NONE__') {
      return GENERIC_ROLES;
    }
    if (selectedDepartment in ROLES_BY_DEPARTMENT) {
        const key = selectedDepartment as keyof typeof ROLES_BY_DEPARTMENT;
        return [...ROLES_BY_DEPARTMENT[key], ...GENERIC_ROLES].sort();
    }
    // For custom departments, only allow generic roles
    return GENERIC_ROLES;
  }, [selectedDepartment]);
  
  useEffect(() => {
    form.reset({
        fullName: "",
        username: "",
        email: "",
        password: "",
        position: undefined,
        departmentName: undefined,
    });
  }, [open, form]);

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
      
      const departmentName = values.departmentName === '__NONE__' ? null : values.departmentName;

      const userData: Omit<UserProfile, 'id' | 'username'> = {
        orgId: orgId,
        fullName: sanitizeInput(values.fullName),
        email: values.email.toLowerCase(),
        position: values.position as UserPosition,
        departmentId: departmentName ? departmentName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and') : null,
        departmentName: departmentName,
        joinedDate: new Date().toISOString(),
        status: 'OFFLINE',
      };

      await updateProfile(newUser, { 
        displayName: sanitizeInput(values.fullName),
        photoURL: null
      });

      const userRef = doc(firestore, "users", newUser.uid);
      const profileData: UserProfile = {
          id: newUser.uid,
          username: sanitizeInput(values.username.toLowerCase()),
          ...userData,
      }
      setDocumentNonBlocking(userRef, profileData, { merge: false });

      toast({
        title: "User Created Successfully",
        description: `${values.fullName} has been added to the team.`,
      });
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
      await deleteApp(tempApp);
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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
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
              <FormField
                control={form.control}
                name="departmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a department" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="__NONE__">No Department</SelectItem>
                            {areDeptsLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : allDepartments?.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDepartment}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a department first" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {availablePositions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
