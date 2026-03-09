'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ListTodo, Plus, FileText, CalendarPlus, BookOpenCheck, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useState } from "react";
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from "@/hooks/usePermissions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type DialogManager = {
  [key in 'workbooks' | 'requisitions' | 'tasks' | 'attendance' | 'leave' | 'reports' | 'profile' | 'newWorkbook' | 'newRequisition' | 'assignTask' | 'requestLeave' | 'chat' | 'settings']: (open: boolean) => void;
};

const navItemsLeft = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { dialog: "tasks", icon: ListTodo, label: "Tasks" },
];

const navItemsRight = [
  { dialog: "workbooks", icon: BookOpenCheck, label: "Workbooks" },
  { dialog: "reports", icon: BarChart, label: "Reports" },
];

const NavItem = ({ item, pathname, dialogManager }: { item: any, pathname: string, dialogManager: DialogManager }) => {
    if ('href' in item) {
        return (
            <Link
                href={item.href}
                key={item.label}
                className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-1",
                pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.label}</span>
            </Link>
        );
    }
    return (
        <button
            key={item.label}
            onClick={() => dialogManager[item.dialog as keyof DialogManager](true)}
            className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-1",
            "text-muted-foreground hover:text-foreground"
            )}
        >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.label}</span>
        </button>
    )
};


export function BottomNavBar({ dialogManager }: { dialogManager: DialogManager }) {
  const pathname = usePathname();
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t bg-background/80 backdrop-blur-lg md:hidden">
        <div className="flex h-full items-center justify-around">
          <div className="flex flex-1 justify-around">
            {navItemsLeft.map(item => (
                <NavItem key={item.label} item={item} pathname={pathname} dialogManager={dialogManager} />
            ))}
          </div>

          <div className="relative -top-6">
             <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
                <SheetTrigger asChild>
                    <Button className="h-16 w-16 rounded-full shadow-lg shadow-primary/40 flex items-center justify-center">
                      <Plus className="h-8 w-8" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-xl">
                    <SheetHeader>
                        <SheetTitle>Create New</SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { dialogManager.assignTask(true); setIsCreateSheetOpen(false); }}>
                            <ListTodo className="h-6 w-6" />
                            New Task
                        </Button>
                        {permissions.canAccessRequisitions && (
                            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { dialogManager.newRequisition(true); setIsCreateSheetOpen(false); }}>
                                <FileText className="h-6 w-6" />
                                New Requisition
                            </Button>
                        )}
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { dialogManager.requestLeave(true); setIsCreateSheetOpen(false); }}>
                            <CalendarPlus className="h-6 w-6" />
                            Request Leave
                        </Button>
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { dialogManager.newWorkbook(true); setIsCreateSheetOpen(false); }}>
                            <BookOpenCheck className="h-6 w-6" />
                            New Workbook
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
          </div>
          
          <div className="flex flex-1 justify-around">
             {navItemsRight.map(item => (
                <NavItem key={item.label} item={item} pathname={pathname} dialogManager={dialogManager} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
