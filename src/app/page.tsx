'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { AuthDialog } from '@/components/auth/AuthDialog';


function PublicLandingPage({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="space-y-8 max-w-2xl">
            <Logo />
            <h1 className="text-4xl md:text-6xl font-bold font-headline">
                Streamline Your Internal Operations.
            </h1>
            <p className="text-lg text-muted-foreground">
                Palilious is the all-in-one platform for staff management, financial requisitions, task automation, and more. 
                Everything your organization needs, in one place.
            </p>
            <Button size="lg" onClick={onLoginClick}>
                Get Started
            </Button>
        </div>
    </div>
  );
}


export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const { isSuperAdmin } = useSuperAdmin();
  const router = useRouter();
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  useEffect(() => {
    // If a user is logged in, but the dialog is open (e.g. from hitting the back button), close it.
    if (user && isAuthDialogOpen) {
      setIsAuthDialogOpen(false);
    }
  }, [user, isAuthDialogOpen]);
  
  useEffect(() => {
      // This is for Super Admin, which has a completely different layout.
      // We will keep this redirect for now as it's a separate part of the app.
      if (!isUserLoading && user) {
          if (isSuperAdmin) {
              router.replace('/superadmin');
          } else {
              router.replace('/overview');
          }
      }
  }, [user, isUserLoading, isSuperAdmin, router])

  // While the initial user state is loading, or if a user is found (and we are waiting for the redirect), show a loader.
  if (isUserLoading || user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }
  
  // If we're done loading and there is no user, show the public landing page.
  return (
    <>
        <PublicLandingPage onLoginClick={() => setIsAuthDialogOpen(true)} />
        <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
            {/* The trigger is part of PublicLandingPage, so this is just for the content */}
        </AuthDialog>
    </>
  );
}
