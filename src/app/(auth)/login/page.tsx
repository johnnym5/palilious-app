'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { buttonVariants, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SuperAdminLoginForm } from '@/components/auth/SuperAdminLoginForm';

export default function LoginPage() {
  const [isSuperAdminLogin, setIsSuperAdminLogin] = useState(false);

  return (
    <div className="flex flex-col items-center gap-8">
      <Logo />
      <Card className="w-full max-w-sm">
        {isSuperAdminLogin ? (
          <>
            <CardHeader>
              <CardTitle>Super Admin</CardTitle>
              <CardDescription>Enter your administrative credentials to sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <SuperAdminLoginForm />
            </CardContent>
            <CardFooter>
              <Button variant="link" className="w-full" onClick={() => setIsSuperAdminLogin(false)}>
                Return to standard login
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
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
                <div className='w-full grid grid-cols-2 gap-2'>
                    <Link href="/register" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                        Register Organization
                    </Link>
                    <Button variant="outline" className="w-full" onClick={() => setIsSuperAdminLogin(true)}>
                        Super Admin
                    </Button>
                </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
