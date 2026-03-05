'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import AppHeader from '@/components/layout/AppHeader';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { hexToHslString } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { theme } = useTheme();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => 
    user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const { config, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const root = document.documentElement;

    // Define defaults based on the new neutral theme in globals.css
    const defaultPrimaryLight = '222.2 47.4% 11.2%';
    const defaultPrimaryDark = '210 40% 98%';
    const defaultAccentLight = '210 40% 96.1%';
    const defaultAccentDark = '217.2 32.6% 17.5%';

    const currentTheme = theme === 'dark' ? 'dark' : 'light';

    // Set Primary Color
    if (config?.branding_color) {
      const hslString = hexToHslString(config.branding_color);
      if (hslString) {
        root.style.setProperty('--primary', hslString);
      }
    } else {
      // Revert to default if no branding color is set
      root.style.setProperty('--primary', currentTheme === 'dark' ? defaultPrimaryDark : defaultPrimaryLight);
    }

    // Set Accent Color
    if (config?.accent_color) {
      const hslString = hexToHslString(config.accent_color);
      if (hslString) {
        root.style.setProperty('--accent', hslString);
      }
    } else {
      // Revert to default if no accent color is set
      root.style.setProperty('--accent', currentTheme === 'dark' ? defaultAccentDark : defaultAccentLight);
    }

  }, [config, theme]);

  // Notification logic
  useEffect(() => {
    if (isProfileLoading || isConfigLoading || !config?.work_hours?.start || !config.work_hours.end || !userProfile) {
        return;
    }

    const checkTimesAndNotify = () => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const [startHour, startMinute] = config.work_hours.start.split(':').map(Number);
        const [endHour, endMinute] = config.work_hours.end.split(':').map(Number);

        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);
        
        // 1. 30 mins before clock-in
        const thirtyMinsBeforeStart = new Date(startTime.getTime() - 30 * 60000);
        if (now >= thirtyMinsBeforeStart && now < startTime) {
            const key = `notified_pre_clock_in_${todayStr}`;
            if (!sessionStorage.getItem(key)) {
                toast({ title: 'Clock-In Reminder', description: 'Your workday starts in 30 minutes. Get ready!' });
                sessionStorage.setItem(key, 'true');
            }
        }

        // 2. 30 mins after clock-in (if not clocked in)
        const thirtyMinsAfterStart = new Date(startTime.getTime() + 30 * 60000);
        if (now > startTime && now <= thirtyMinsAfterStart && userProfile.status !== 'ONLINE') {
            const key = `notified_post_clock_in_${todayStr}`;
            if (!sessionStorage.getItem(key)) {
                toast({ variant: 'destructive', title: 'Late Clock-In?', description: 'Your workday has started. Please remember to clock in.' });
                sessionStorage.setItem(key, 'true');
            }
        }
        
        // 3. 30 mins before clock-out
        const thirtyMinsBeforeEnd = new Date(endTime.getTime() - 30 * 60000);
        if (now >= thirtyMinsBeforeEnd && now < endTime) {
            const key = `notified_pre_clock_out_${todayStr}`;
            if (!sessionStorage.getItem(key)) {
               toast({ title: 'End of Day Reminder', description: 'Your workday ends in 30 minutes. Time to wrap up!' });
               sessionStorage.setItem(key, 'true');
            }
        }

        // 4. After closing time (if still clocked in)
        if (now > endTime && userProfile.status === 'ONLINE') {
            const key = `notified_post_clock_out_${todayStr}`;
             if (!sessionStorage.getItem(key)) {
                toast({ title: 'Clock-Out Reminder', description: 'Your workday has ended. Don\'t forget to clock out!' });
                sessionStorage.setItem(key, 'true');
            }
        }
    };
    
    // Check immediately and then every minute
    checkTimesAndNotify(); 
    const intervalId = setInterval(checkTimesAndNotify, 60000);

    return () => clearInterval(intervalId);

  }, [config, userProfile, isProfileLoading, isConfigLoading, toast]);


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
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-40 bg-background/80 backdrop-blur-md transition-transform hover:scale-110 active:scale-100 border-2 border-primary/50 hover:border-primary"
          aria-label="Go back"
        >
          <ArrowLeft className="h-6 w-6" />
      </Button>
    </div>
  );
}
