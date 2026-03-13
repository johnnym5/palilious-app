'use client';
import { UserNav } from "@/components/layout/UserNav";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Clock, Bell, CheckCheck } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, orderBy, writeBatch } from 'firebase/firestore';
import type { UserProfile, Notification } from '@/lib/types';
import { UniversalSearch } from './UniversalSearch';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from "@/lib/utils";
import { showBrowserNotification } from '@/lib/notifications';


export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(new Set());

  // Get user profile and permissions
  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Start of logic from Notifications ---
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: notifications, isLoading: areNotificationsLoading } = useCollection<Notification>(notificationsQuery);

  useEffect(() => {
    if (areNotificationsLoading || !notifications || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    
    // Filter for notifications that are new and unread
    const newUnreadNotifications = notifications.filter(
      n => !n.isRead && !shownNotificationIds.has(n.id)
    );
  
    if (newUnreadNotifications.length > 0) {
      // Show notification for the most recent new one
      const latestNotification = newUnreadNotifications[0];
      
      showBrowserNotification(
        latestNotification.title,
        {
          body: latestNotification.description,
          tag: latestNotification.id, // Using tag to prevent multiple popups for the same notification
        },
        latestNotification.id
      );

      // Add all new notifications to the shown set
      setShownNotificationIds(prev => {
        const newSet = new Set(prev);
        newUnreadNotifications.forEach(n => newSet.add(n.id));
        return newSet;
      });
    }
  }, [notifications, areNotificationsLoading, shownNotificationIds]);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
        const notifRef = doc(firestore, 'notifications', notification.id);
        updateDocumentNonBlocking(notifRef, { isRead: true });
    }
    router.push(notification.href);
    setIsNotificationsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    if (!firestore || !notifications || unreadCount === 0) return;
    
    const batch = writeBatch(firestore);
    notifications.forEach(n => {
        if (!n.isRead) {
            const notifRef = doc(firestore, 'notifications', n.id);
            batch.update(notifRef, { isRead: true });
        }
    });
    batch.commit();
  };
  // --- End of logic from Notifications ---

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
        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                          {unreadCount}
                      </span>
                  )}
                  <span className="sr-only">Toggle notifications</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark all as read
                    </Button>
                </div>
                <ScrollArea className="h-96">
                    <div className="p-2">
                        {areNotificationsLoading && <div className="p-4"><Skeleton className="h-20 w-full" /></div>}
                        {!areNotificationsLoading && (!notifications || notifications.length === 0) && (
                            <p className="text-center text-sm text-muted-foreground py-16">No notifications yet.</p>
                        )}
                        {!areNotificationsLoading && notifications?.map(notif => (
                            <div 
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={cn(
                                    "p-3 rounded-lg hover:bg-secondary cursor-pointer",
                                    !notif.isRead && "bg-secondary/50"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    {!notif.isRead && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />}
                                    <div className={cn("flex-1", notif.isRead ? "" : "pl-1")}>
                                        <p className="font-semibold text-sm">{notif.title}</p>
                                        <p className="text-sm text-muted-foreground">{notif.description}</p>
                                        <p className="text-xs text-muted-foreground/80 mt-1">
                                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
          </Popover>
        <UserNav userProfile={userProfile} />
      </div>
    </header>
  );
}
