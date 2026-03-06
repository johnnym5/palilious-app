'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ListTodo, Bell, User, Plus, FileText, CalendarPlus, BookCopy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useState } from "react";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, orderBy, writeBatch } from 'firebase/firestore';
import type { UserProfile, Notification } from '@/lib/types';
import { AssignTaskDialog } from "../tasks/AssignTaskDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { NewRequisitionDialog } from "../requisitions/NewRequisitionDialog";
import { RequestLeaveDialog } from '../leave/RequestLeaveDialog';
import { NewWorkbookDialog } from '../workbook/NewWorkbookDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from "../ui/skeleton";
import { ProfileDialog } from "../profile/ProfileDialog";


const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);
  const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);


  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  // --- Start of logic from Notifications.tsx ---
  const notificationsQuery = useMemoFirebase(() => {
    if (!authUser) return null;
    return query(
        collection(firestore, 'notifications'),
        where('userId', '==', authUser.uid),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, authUser]);

  const { data: notifications, isLoading: areNotificationsLoading } = useCollection<Notification>(notificationsQuery);

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
  // --- End of logic from Notifications.tsx ---


  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const isActive = pathname === href;
    const content = (
      <div className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-16",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}>
          <Icon className="h-6 w-6" />
          <span className="text-xs font-medium">{label}</span>
      </div>
    );
    
    return <Link href={href}>{content}</Link>;
  };

  const ProfileButton = () => {
    return (
      <button
        onClick={() => setIsProfileOpen(true)}
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-16",
          "text-muted-foreground hover:text-foreground"
        )}
      >
        <User className="h-6 w-6" />
        <span className="text-xs font-medium">Profile</span>
      </button>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden">
        <div className="flex h-20 items-center justify-around">
          <NavItem {...navItems[0]} />
          <NavItem {...navItems[1]} />
          <div className="w-16 h-16" /> {/* Spacer for FAB */}
          
          <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <PopoverTrigger asChild>
              <div className="relative flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-16 cursor-pointer text-muted-foreground hover:text-foreground">
                <Bell className="h-6 w-6" />
                <span className="text-xs font-medium">Alerts</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {unreadCount}
                    </span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mb-4" align="center" side="top">
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

          <ProfileButton />
        </div>
      </div>
       <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 md:hidden">
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="h-16 w-16 rounded-full shadow-lg shadow-primary/40">
                  <Plus className="h-8 w-8" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" className="mb-2">
                <DropdownMenuItem onSelect={() => setIsAssignTaskOpen(true)}>
                    <ListTodo className="mr-2 h-4 w-4" />
                    New Task
                </DropdownMenuItem>
                {permissions.canAccessRequisitions && <DropdownMenuItem onSelect={() => setIsNewRequestOpen(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    New Requisition
                </DropdownMenuItem>}
                 <DropdownMenuItem onSelect={() => setIsRequestLeaveOpen(true)}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Request Leave
                </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setIsNewWorkbookOpen(true)}>
                    <BookCopy className="mr-2 h-4 w-4" />
                    New Workbook
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
       </div>

       {userProfile && (
            <AssignTaskDialog 
                open={isAssignTaskOpen} 
                onOpenChange={setIsAssignTaskOpen} 
                currentUserProfile={userProfile} 
                permissions={permissions}
            />
       )}
       {userProfile && (
            <NewRequisitionDialog 
                open={isNewRequestOpen} 
                onOpenChange={setIsNewRequestOpen} 
                userProfile={userProfile}
            />
       )}
       {userProfile && (
            <RequestLeaveDialog 
                open={isRequestLeaveOpen} 
                onOpenChange={setIsRequestLeaveOpen} 
                userProfile={userProfile}
            />
       )}
       {userProfile && (
            <NewWorkbookDialog 
                open={isNewWorkbookOpen} 
                onOpenChange={setIsNewWorkbookOpen} 
                userProfile={userProfile}
            />
       )}
       <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </>
  );
}
