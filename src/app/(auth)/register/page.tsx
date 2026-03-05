import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center gap-8">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an Organization</CardTitle>
          <CardDescription>Start by creating an account for your organization's administrator.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
             <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Already have an account?
                    </span>
                </div>
            </div>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                Sign In
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
