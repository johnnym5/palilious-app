'use client';
import { UserNav } from "@/components/layout/UserNav";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Clock } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { UniversalSearch } from './UniversalSearch';
import { Skeleton } from '@/components/ui/skeleton';


export default function AppHeader() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Get user profile and permissions
  const userProfileRef = useMemoFirebase(() => 
    user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-lg sm:h-16 sm:px-6">
       <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <VisuallyHidden>
            <SheetHeader>
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Main navigation links for the application.</SheetDescription>
            </SheetHeader>
          </VisuallyHidden>
          <AppSidebar isMobile />
        </SheetContent>
      </Sheet>
      <div className="flex-1">
        {userProfile && <UniversalSearch userProfile={userProfile} />}
      </div>
      <div className='flex items-center gap-2'>
        <div className='hidden sm:flex items-center gap-2 text-muted-foreground'>
            <Clock className='h-4 w-4' />
            {currentTime ? (
              <p className="text-sm">{format(currentTime, 'PPP, p')}</p>
            ) : (
              <Skeleton className="h-4 w-40" />
            )}
        </div>
        <UserNav />
      </div>
    </header>
  );
}
