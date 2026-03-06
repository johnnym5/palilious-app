'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { SupportDialog } from './SupportDialog';
import { Button } from '../ui/button';

interface AuthDialogProps {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ children, open, onOpenChange }: AuthDialogProps) {
    const [isSupportOpen, setIsSupportOpen] = useState(false);

    // When the main auth dialog closes, also close the support one if it's open.
    const handleMainOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setIsSupportOpen(false);
        }
        onOpenChange(isOpen);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleMainOpenChange}>
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Sign In</TabsTrigger>
                            <TabsTrigger value="register">Register</TabsTrigger>
                        </TabsList>
                        <TabsContent value="login" className="pt-4">
                            <DialogHeader>
                                <DialogTitle>Welcome Back</DialogTitle>
                                <DialogDescription>Enter your credentials to access your dashboard.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <LoginForm />
                            </div>
                        </TabsContent>
                        <TabsContent value="register" className="pt-4">
                            <DialogHeader>
                                <DialogTitle>Create an Organization</DialogTitle>
                                <DialogDescription>Start by creating an account for your administrator.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <RegisterForm />
                            </div>
                        </TabsContent>
                    </Tabs>
                    <div className="text-center text-sm text-muted-foreground pt-2 border-t">
                        Having trouble?{' '}
                        <Button variant="link" className="p-0 h-auto" onClick={() => setIsSupportOpen(true)}>Contact Support</Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                 <SupportDialog />
            </Dialog>
        </>
    );
}
