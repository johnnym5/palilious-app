'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from "@/hooks/usePermissions";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { mainNavItems } from "@/lib/nav-items";
import { uiEmitter } from "@/lib/ui-emitter";

export function BottomNavBar() {
  const pathname = usePathname();
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    firestore && authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  const handleDialogClick = (dialog: string) => {
    switch(dialog) {
      case 'chat': uiEmitter.emit('open-chat-dialog'); break;
      case 'settings': uiEmitter.emit('open-settings-dialog'); break;
      case 'tasks': uiEmitter.emit('open-tasks-dialog'); break;
      case 'workbooks': uiEmitter.emit('open-workbooks-dialog'); break;
      case 'requisitions': uiEmitter.emit('open-requisitions-dialog'); break;
      case 'attendance': uiEmitter.emit('open-attendance-dialog'); break;
      case 'leave': uiEmitter.emit('open-leave-dialog'); break;
      case 'reports': uiEmitter.emit('open-reports-dialog'); break;
    }
  };

  const navItems = mainNavItems.filter(item => !item.isSeparator);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 h-20 border-t bg-background/80 backdrop-blur md:hidden">
      <ScrollArea className="w-full h-full whitespace-nowrap">
        <div className="flex w-max items-center h-full px-4">
          {navItems.map(item => {
              if ('permission' in item && !permissions[item.permission as keyof typeof permissions]) {
                return null;
              }

              if ('href' in item) {
                return (
                  <Link href={item.href} key={item.label} className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors h-full w-20",
                    pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}>
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium truncate">{item.label}</span>
                  </Link>
                );
              }
              
              if ('dialog' in item) {
                  return (
                    <button key={item.label} onClick={() => handleDialogClick(item.dialog)} className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors h-full w-20",
                      "text-muted-foreground hover:text-foreground"
                    )}>
                      <item.icon className="h-6 w-6" />
                      <span className="text-xs font-medium truncate">{item.label}</span>
                    </button>
                  );
              }
              
              return null;
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
