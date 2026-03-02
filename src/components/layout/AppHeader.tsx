'use client';
import { UserNav } from "@/components/layout/UserNav";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Clock } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { usePermissions } from '@/hooks/usePermissions';
import { doc, collection, query, where } from 'firebase/firestore';
import type { UserProfile, Task, Requisition } from '@/lib/types';
import { ThemeToggle } from './ThemeToggle';


export default function AppHeader() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get user profile and permissions
  const userProfileRef = useMemoFirebase(() => 
    user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  // --- Data Fetching for Tactical Brief ---
  const overdueTasksQuery = useMemoFirebase(() => {
      if (!user) return null;
      return query(
          collection(firestore, 'tasks'),
          where('assignedTo', '==', user.uid),
          where('status', 'in', ['QUEUED', 'ACTIVE', 'AWAITING_REVIEW'])
      );
  }, [firestore, user]);
  const { data: activeTasks } = useCollection<Task>(overdueTasksQuery);
  const overdueTaskCount = useMemo(() => {
      if (!activeTasks) return 0;
      const now = new Date();
      return activeTasks.filter(task => task.dueDate && new Date(task.dueDate) < now).length;
  }, [activeTasks]);

  const inboxReqsQuery = useMemoFirebase(() => {
      if (!userProfile || !permissions) return null;
      const inboxStatuses: string[] = [];
      if (permissions.canApproveHR) inboxStatuses.push('PENDING_HR');
      if (permissions.canApproveFinance) inboxStatuses.push('PENDING_FINANCE', 'APPROVED');
      if (permissions.canApproveMD) inboxStatuses.push('PENDING_MD');
      
      if (inboxStatuses.length > 0) {
          return query(
              collection(firestore, 'requisitions'),
              where('orgId', '==', userProfile.orgId),
              where('status', 'in', [...new Set(inboxStatuses)])
          );
      }
      return null;
  }, [firestore, userProfile, permissions]);
  const { data: inboxReqs } = useCollection<Requisition>(inboxReqsQuery);
  const pendingReqsCount = useMemo(() => inboxReqs?.length || 0, [inboxReqs]);


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTitle = () => {
    if (pathname.includes('/dashboard')) {
        const briefParts = [];
        if (overdueTaskCount > 0) {
            briefParts.push(`${overdueTaskCount} task${overdueTaskCount > 1 ? 's' : ''} overdue`);
        }
        if (pendingReqsCount > 0) {
            briefParts.push(`${pendingReqsCount} requisition${pendingReqsCount > 1 ? 's' : ''} await${pendingReqsCount === 1 ? 's' : ''} your action`);
        }

        if (briefParts.length > 0) {
            return `Tactical Brief: ${briefParts.join(' & ')}.`;
        }
        
        const userFirstName = user?.displayName?.split(' ')[0];
        return userFirstName ? `Welcome back, ${userFirstName}!` : 'Dashboard';
    }
    // Capitalize the first letter of the route segment
    const segment = pathname.split('/').pop()?.replace('-', ' ') || '';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }

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
        <h1 className="text-lg font-semibold font-headline hidden md:block">{getTitle()}</h1>
      </div>
      <div className='flex items-center gap-4'>
        <div className='hidden sm:flex items-center gap-2 text-muted-foreground'>
            <Clock className='h-4 w-4' />
            <p className="text-sm">{format(currentTime, 'PPP, p')}</p>
        </div>
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
