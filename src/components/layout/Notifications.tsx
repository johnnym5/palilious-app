'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, writeBatch } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Notifications() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const notificationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, user]);

    const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

    const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            const notifRef = doc(firestore, 'notifications', notification.id);
            updateDocumentNonBlocking(notifRef, { isRead: true });
        }
        router.push(notification.href);
        setIsOpen(false);
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


    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                 <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                            {unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifications</span>
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
                        {isLoading && <div className="p-4"><Skeleton className="h-20 w-full" /></div>}
                        {!isLoading && (!notifications || notifications.length === 0) && (
                            <p className="text-center text-sm text-muted-foreground py-16">No notifications yet.</p>
                        )}
                        {!isLoading && notifications?.map(notif => (
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
    );
}
