'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the auth state is determined
    if (!isUserLoading) {
      if (user) {
        // If user is logged in, go to the dashboard
        router.replace('/dashboard');
      } else {
        // If not logged in, go to the login page
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, router]);

  // Display a loading spinner while checking auth status
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="animate-spin text-primary w-12 h-12" />
    </div>
  );
}
