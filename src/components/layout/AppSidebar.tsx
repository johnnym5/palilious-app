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

type DialogManager = {
  [key in 'settings' | 'workbooks' | 'requisitions' | 'tasks' | 'attendance' | 'chat' | 'leave' | 'reports' | 'profile']: (open: boolean) => void;
};

const mainNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { isSeparator: true },
  { dialog: "attendance", icon: CalendarCheck2, label: "Attendance" },
  { dialog: "leave", icon: CalendarPlus, label: "Leave" },
  { dialog: "chat", icon: MessagesSquare, label: "Chat", permission: 'canAccessChat' },
  { isSeparator: true },
  { dialog: "tasks", icon: ListTodo, label: "Tasks" },
  { dialog: "workbooks", icon: BookOpenCheck, label: "Workbooks" },
  { dialog: "requisitions", icon: ReceiptText, label: "Requisitions", permission: 'canAccessRequisitions' },
  { isSeparator: true },
  { dialog: "reports", icon: BarChart, label: "Reports" },
  { dialog: "settings", icon: Settings, label: "Settings", permission: 'canManageStaff' },
];


export default function AppSidebar({ isMobile = false, dialogManager }: { isMobile?: boolean, dialogManager: DialogManager }) {
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

            if ('href' in item) {
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        pathname.startsWith(item.href) && "bg-secondary text-primary",
                        isMobile && "text-lg"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                );
            }
            
            if ('permission' in item && !permissions[item.permission as keyof typeof permissions]) {
                return null;
            }

            return (
                <button
                    key={item.dialog}
                    onClick={() => dialogManager[item.dialog as keyof DialogManager](true)}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-left w-full",
                        isMobile && "text-lg"
                    )}
                >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                </button>
            )
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
