"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck2,
  ReceiptText,
  ListTodo,
  MessagesSquare,
  LogOut,
  Users,
  Building2,
  BookOpenCheck,
  User as UserIcon,
  Settings,
  BarChart,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile, Organization } from "@/lib/types";
import { useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { Skeleton } from "../ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "../ui/badge";
import { useSystemConfig } from "@/hooks/useSystemConfig";

const mainNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/attendance", icon: CalendarCheck2, label: "Attendance" },
  { href: "/requisitions", icon: ReceiptText, label: "Requisitions" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/workbook", icon: BookOpenCheck, label: "Workbook" },
  { href: "/chat", icon: MessagesSquare, label: "Chat" },
];

const adminNavItems = [
    { href: "/team", icon: Users, label: "Team Management", permission: 'canManageStaff' },
    { href: "/company", icon: Building2, label: "Company Settings", permission: 'canManageCompany' },
    { href: "/reports", icon: BarChart, label: "Reports", permission: 'canManageStaff' },
] as const;

export default function AppSidebar({ isMobile = false }) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
  
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
          {mainNavItems.map((item) => {
            if (item.href === "/requisitions" && !permissions.canAccessRequisitions) {
                return null;
            }
            if (item.href === "/chat" && !permissions.canAccessChat) {
                return null;
            }
            return <NavLink key={item.href} {...item} />
          })}
          
          <div className="my-2 h-px w-full bg-border" />
          
          {isProfileLoading || isConfigLoading ? <Skeleton className="h-8 w-full" /> : (
            userProfile && adminNavItems
              .filter(item => {
                  if (item.permission === 'canManageStaff') {
                      // ORG_ADMIN can always see this. Others depend on the toggle.
                      return userProfile.position === 'Organization Administrator' || (systemConfig?.admin_tools && permissions.canManageStaff);
                  }
                  return permissions[item.permission];
              })
              .map((item) => (
                  <NavLink key={item.href} {...item} />
              ))
          )}

          <div className="my-2 h-px w-full bg-border" />
          <NavLink href="/profile" icon={UserIcon} label="Profile" />
          <NavLink href="/settings" icon={Settings} label="Settings" />
        </nav>

        <div className="mt-auto border-t p-4">
            <div className="flex items-center gap-3 rounded-lg">
                {isProfileLoading ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : (
                  <Avatar className="h-10 w-10">
                      <AvatarImage src={userProfile?.avatarURL || undefined} alt={userProfile?.fullName || ''} />
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
