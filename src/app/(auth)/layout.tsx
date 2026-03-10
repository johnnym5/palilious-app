'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && user) {
            router.replace('/overview');
        }
    }, [user, isUserLoading, router]);

    // While checking for user or if user is found, show a loader until redirect happens.
    if (isUserLoading || user) {
        return (
             <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary w-12 h-12" />
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            {children}
        </main>
    );
}
