'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ListTodo, User, Plus, FileText, CalendarPlus, BookOpenCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useState } from "react";
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { AssignTaskDialog } from "../tasks/AssignTaskDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { NewRequisitionDialog } from "../requisitions/NewRequisitionDialog";
import { RequestLeaveDialog } from '../leave/RequestLeaveDialog';
import { NewWorkbookDialog } from '../workbook/NewWorkbookDialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type DialogManager = {
  [key in 'settings' | 'workbooks' | 'requisitions' | 'tasks' | 'attendance' | 'chat' | 'leave' | 'reports' | 'profile']: (open: boolean) => void;
};

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { dialog: "tasks", icon: ListTodo, label: "Tasks" },
  { dialog: "workbooks", icon: BookOpenCheck, label: "Workbooks" },
  { dialog: "profile", icon: User, label: "Profile" },
];

export function BottomNavBar({ dialogManager }: { dialogManager: DialogManager }) {
  const pathname = usePathname();
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);
  const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden">
        <div className="flex h-16 items-center">
          {navItems.map(item => {
              if ('href' in item) {
                return (
                    <Link 
                        href={item.href}
                        key={item.label}
                        className={cn(
                        "flex flex-1 flex-col items-center gap-1 p-2 rounded-lg transition-colors",
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
                    "flex flex-1 flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                    "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                </button>
              )
          })}
        </div>
      </div>
       <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 md:hidden">
            <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
                <SheetTrigger asChild>
                    <Button className="h-14 w-14 rounded-full shadow-lg shadow-primary/40">
                      <Plus className="h-8 w-8" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-xl">
                    <SheetHeader>
                        <SheetTitle>Create New</SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { setIsAssignTaskOpen(true); setIsCreateSheetOpen(false); }}>
                            <ListTodo className="h-6 w-6" />
                            New Task
                        </Button>
                        {permissions.canAccessRequisitions && (
                            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { setIsNewRequestOpen(true); setIsCreateSheetOpen(false); }}>
                                <FileText className="h-6 w-6" />
                                New Requisition
                            </Button>
                        )}
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { setIsRequestLeaveOpen(true); setIsCreateSheetOpen(false); }}>
                            <CalendarPlus className="h-6 w-6" />
                            Request Leave
                        </Button>
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { setIsNewWorkbookOpen(true); setIsCreateSheetOpen(false); }}>
                            <BookOpenCheck className="h-6 w-6" />
                            New Workbook
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
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
    </>
  );
}
