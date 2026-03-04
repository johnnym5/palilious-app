'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import AppHeader from '@/components/layout/AppHeader';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { hexToHslString } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { theme } = useTheme();

  const userProfileRef = useMemoFirebase(() => 
    user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const { config } = useSystemConfig(userProfile?.orgId);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // When the config loads or changes, apply the branding color
    if (config?.branding_color) {
      const hslString = hexToHslString(config.branding_color);
      if (hslString) {
        document.documentElement.style.setProperty('--primary', hslString);
      }
    } else {
        // When no branding color is set, revert to the default theme color
        // This requires knowing the default for light/dark themes
        const defaultPrimaryLight = '232 59% 60%';
        const defaultPrimaryDark = '232 59% 60%';
        
        const currentTheme = theme === 'dark' ? 'dark' : 'light';

        if (currentTheme === 'dark') {
             document.documentElement.style.setProperty('--primary', defaultPrimaryDark);
        } else {
             document.documentElement.style.setProperty('--primary', defaultPrimaryLight);
        }
    }
  }, [config, theme]);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1">
        <AppHeader />
        <main className="flex-1 p-4 sm:p-6 bg-secondary/30">
          {children}
        </main>
      </div>
      <Button
          onClick={() => router.back()}
          variant="outline"
          size="icon"
          className="fixed bottom-6 left-4 md:left-[19.5rem] h-14 w-14 rounded-full shadow-lg z-50 bg-background/80 backdrop-blur-md transition-transform hover:scale-110 active:scale-100 border-2 border-primary/50 hover:border-primary"
          aria-label="Go back"
        >
          <ArrowLeft className="h-6 w-6" />
      </Button>
    </div>
  );
}
