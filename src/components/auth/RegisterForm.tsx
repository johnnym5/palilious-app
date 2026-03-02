"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, setDocumentNonBlocking, addDocumentNonBlocking, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, doc } from "firebase/firestore";
import type { Organization, UserProfile, SystemConfig } from "@/lib/types";

const formSchema = z.object({
  organizationName: z.string().min(1, { message: "Organization name is required." }),
  fullName: z.string().min(1, { message: "Your name is required." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

type FormData = z.infer<typeof formSchema>;

export function RegisterForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: "",
      fullName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    try {
      // 1. Create the Firebase Auth user, use lowercase email for consistency
      const userCredential = await createUserWithEmailAndPassword(auth, values.email.toLowerCase(), values.password);
      const newUser = userCredential.user;

      // 2. Create the Organization document, store name as lowercase for case-insensitive lookup
      const orgsCollection = collection(firestore, "organizations");
      const orgData: Omit<Organization, 'id'> = {
        name: values.organizationName.toLowerCase(),
        ownerId: newUser.uid,
        createdAt: new Date().toISOString(),
      };
      const orgDocRef = await addDocumentNonBlocking(orgsCollection, orgData);

      if (!orgDocRef) {
        throw new Error("Failed to create organization document.");
      }
      
      // 2.5 Create the default SystemConfig for the new organization
      const configCollection = collection(firestore, "system_configs");
      const configData: Omit<SystemConfig, 'id'> = {
          orgId: orgDocRef.id,
          finance_access: true,
          admin_tools: true,
          attendance_strict: false, // Default to false as it's not implemented
      };
      await addDocumentNonBlocking(configCollection, configData);

      // 3. Create the UserProfile document for the ORG_ADMIN
      const userDocRef = doc(firestore, "users", newUser.uid);
      // Store email and username as lowercase for case-insensitive lookup
      const userProfileData: Omit<UserProfile, 'id'> = {
        orgId: orgDocRef.id,
        email: values.email.toLowerCase(),
        username: values.username.toLowerCase(),
        fullName: values.fullName,
        position: 'Organization Administrator',
        joinedDate: new Date().toISOString(),
        status: 'OFFLINE',
        avatarURL: `https://picsum.photos/seed/${newUser.uid}/48/48`,
      };
      
      await updateProfile(newUser, { 
        displayName: values.fullName,
        photoURL: userProfileData.avatarURL
      });
      
      setDocumentNonBlocking(userDocRef, {id: newUser.uid, ...userProfileData}, { merge: false });

      toast({
        title: "Registration Successful",
        description: `Organization "${values.organizationName}" created.`,
      });

      // Redirect is handled by the useEffect on auth state change
    } catch (error: any) {
      console.error("Registration Error: ", error);
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isSubmitting || isUserLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Company, Inc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Full Name</FormLabel>
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
              <FormLabel>Administrator Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="admin@yourcompany.com" {...field} />
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Organization
        </Button>
      </form>
    </Form>
  );
}
