'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck2,
  ReceiptText,
  ListTodo,
  MessagesSquare,
  LogOut,
  Settings,
  BarChart,
  CalendarPlus,
  BookOpenCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useAuth, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile, Organization } from "@/lib/types";
import { useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { Skeleton } from "../ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

const mainNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { isSeparator: true },
  { href: "/attendance", icon: CalendarCheck2, label: "Attendance" },
  { href: "/leave", icon: CalendarPlus, label: "Leave" },
  { href: "/chat", icon: MessagesSquare, label: "Chat" },
  { isSeparator: true },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/workbook", icon: BookOpenCheck, label: "Workbooks" },
  { href: "/requisitions", icon: ReceiptText, label: "Requisitions" },
  { isSeparator: true },
  { href: "/reports", icon: BarChart, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings", permission: 'canManageStaff' },
];


export default function AppSidebar({ isMobile = false, onOpenSettings, onOpenWorkbooks, onOpenRequisitions, onOpenTasks }: { isMobile?: boolean, onOpenSettings: () => void, onOpenWorkbooks: () => void, onOpenRequisitions: () => void, onOpenTasks: () => void }) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  
  const orgRef = useMemoFirebase(() => 
    userProfile?.orgId ? doc(firestore, "organizations", userProfile.orgId) : null,
  [firestore, userProfile?.orgId]);
  const { data: organization, isLoading: isOrgLoading } = useDoc<Organization>(orgRef);


  const handleLogout = () => {
    signOut(auth);
  };

  const NavLink = ({ href, icon: Icon, label }: { href: string, icon: React.ElementType, label: string }) => {
    const isActive = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
          isActive && "bg-secondary text-primary",
          isMobile && "text-lg"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };
  
  const orgName = organization?.name ? organization.name.charAt(0).toUpperCase() + organization.name.slice(1) : "";

  if (!authUser) return null;

  return (
    <aside className={cn("flex-col border-r bg-background", isMobile ? "flex w-full" : "hidden md:flex md:w-72")}>
      <div className="flex h-16 items-center border-b px-6">
        {isOrgLoading ? <Skeleton className="h-6 w-3/4" /> :
          <h2 className="truncate font-bold text-xl text-foreground">{orgName}</h2>
        }
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <nav className="grid items-start gap-1 p-4 text-sm font-medium">
          {mainNavItems.map((item, index) => {
            if ('isSeparator' in item) {
                return <Separator key={`sep-${index}`} className="my-2" />;
            }
            if (item.href === "/chat" && !permissions.canAccessChat) {
                return null;
            }
             if (item.href === '/tasks') {
                return (
                    <button
                        key={item.href}
                        onClick={onOpenTasks}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-left w-full",
                          isMobile && "text-lg"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </button>
                )
             }
             if (item.href === '/workbook') {
                return (
                    <button
                        key={item.href}
                        onClick={onOpenWorkbooks}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-left w-full",
                          isMobile && "text-lg"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </button>
                )
             }
            if (item.href === '/requisitions') {
                if (!permissions.canAccessRequisitions) return null;
                return (
                    <button
                        key={item.href}
                        onClick={onOpenRequisitions}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-left w-full",
                          isMobile && "text-lg"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </button>
                )
             }
             if (item.href === '/settings') {
                if (!permissions.canManageStaff) return null;
                return (
                    <button
                        key={item.href}
                        onClick={onOpenSettings}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-left w-full",
                          isMobile && "text-lg"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </button>
                )
             }
            return <NavLink key={item.href} {...item} />
          })}
        </nav>

        <div className="mt-auto border-t p-4">
            <div className="flex items-center gap-3 rounded-lg">
                {isProfileLoading ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : (
                  <Avatar className="h-10 w-10">
                      <AvatarFallback>{userProfile?.fullName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 truncate">
                    <p className="font-semibold">{userProfile?.fullName}</p>
                    <Badge variant="secondary" className="text-xs">{userProfile?.position}</Badge>
                </div>
                <button onClick={handleLogout} className="ml-auto">
                    <LogOut className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/>
                </button>
            </div>
        </div>
      </div>
    </aside>
  );
}
