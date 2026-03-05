"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, Bell, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useState } from "react";
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { AssignTaskDialog } from "../tasks/AssignTaskDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { NewRequisitionDialog } from "../requisitions/NewRequisitionDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/alerts", icon: Bell, label: "Alerts", isPlaceholder: true },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, 'users', authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);


  const NavItem = ({ href, icon: Icon, label, isPlaceholder }: (typeof navItems)[0]) => {
    const isActive = !isPlaceholder && pathname === href;
    const content = (
      <div className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-16",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}>
          <Icon className="h-6 w-6" />
          <span className="text-xs font-medium">{label}</span>
      </div>
    );
    
    if (isPlaceholder) return content;
    
    return <Link href={href}>{content}</Link>;
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg">
        <div className="flex h-20 items-center justify-around">
          <NavItem {...navItems[0]} />
          <NavItem {...navItems[1]} />
          <div className="w-16 h-16" /> {/* Spacer for FAB */}
          <NavItem {...navItems[2]} />
          <NavItem {...navItems[3]} />
        </div>
      </div>
       <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="h-16 w-16 rounded-full shadow-lg shadow-primary/40">
                  <Plus className="h-8 w-8" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" className="mb-2">
                <DropdownMenuItem onSelect={() => setIsAssignTaskOpen(true)}>
                    New Task
                </DropdownMenuItem>
                {permissions.canAccessRequisitions && <DropdownMenuItem onSelect={() => setIsNewRequestOpen(true)}>
                    New Requisition
                </DropdownMenuItem>}
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
    </>
  );
}
