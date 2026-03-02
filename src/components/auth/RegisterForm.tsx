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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole } from "@/lib/types";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { initiateEmailSignUp, setDocumentNonBlocking, useAuth, useFirestore, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { doc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "firebase/auth";

const roles: UserRole[] = ['STAFF', 'HR', 'FINANCE', 'MD'];

const formSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  role: z.enum(roles, { required_error: "Role is required." }),
});

type FormData = z.infer<typeof formSchema>;

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  // Effect to create user document after successful registration and user object is available
  useEffect(() => {
    if (user && formData && firestore) {
      const userRef = doc(firestore, "users", user.uid);
      const userData = {
        id: user.uid,
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        joinedDate: new Date().toISOString(),
        status: 'ONLINE',
        avatarURL: `https://picsum.photos/seed/${user.uid}/48/48`,
        createdAt: serverTimestamp(),
      };
      
      // Update Firebase Auth user profile
      updateProfile(user, { 
        displayName: formData.fullName,
        photoURL: `https://picsum.photos/seed/${user.uid}/48/48`
      }).then(() => {
        // Set user document in Firestore
        setDocumentNonBlocking(userRef, userData, { merge: true });
        // Redirect to dashboard
        router.push('/dashboard');
      }).catch((error) => {
        console.error("Error updating profile: ", error);
        toast({
          variant: "destructive",
          title: "Profile Update Failed",
          description: "Could not set your display name or photo.",
        });
        setIsLoading(false);
      });
    }
  }, [user, formData, firestore, router, toast]);

  function onSubmit(values: FormData) {
    setIsLoading(true);
    setFormData(values); // Store form data to be used in useEffect
    initiateEmailSignUp(auth, values.email, values.password);

    // Handle potential registration errors
    setTimeout(() => {
        if (!auth.currentUser && !isUserLoading) {
            setIsLoading(false);
            setFormData(null);
            toast({
                variant: 'destructive',
                title: 'Registration Failed',
                description: 'An account with this email might already exist or the password is too weak.',
            });
        }
    }, 3000);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
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
  );
}
