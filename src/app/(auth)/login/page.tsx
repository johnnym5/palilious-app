'use client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SupportDialog } from "@/components/auth/SupportDialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

export default function LoginPage() {
  return (
    <Dialog>
        <div className="flex flex-col items-center gap-8">
            <Logo />
            <Card className="w-full max-w-sm">
                <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Enter your organization, username, and password to sign in.</CardDescription>
                </CardHeader>
                <CardContent>
                <LoginForm />
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                            Or
                            </span>
                        </div>
                    </div>
                    <Link href="/register" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                        Register Organization
                    </Link>
                     <div className="text-center text-sm text-muted-foreground pt-2">
                        Having trouble?{' '}
                        <DialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto">Contact Support</Button>
                        </DialogTrigger>
                    </div>
                </CardFooter>
            </Card>
        </div>
        <SupportDialog />
    </Dialog>
  );
}
