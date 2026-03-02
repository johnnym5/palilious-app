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
} from "lucide-react";

import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { mockCurrentUser, mockUsers } from "@/lib/placeholder-data";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const mainNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/attendance", icon: CalendarCheck2, label: "Attendance" },
  { href: "/requisitions", icon: ReceiptText, label: "Requisitions" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/chat", icon: MessagesSquare, label: "Chat" },
];

const adminNavItems = [
    { href: "/team", icon: Users, label: "Team Management", roles: ['HR', 'MD'] },
    { href: "/company", icon: Building2, label: "Company Settings", roles: ['MD'] },
]

export default function AppSidebar({ isMobile = false }) {
  const pathname = usePathname();
  const user = mockCurrentUser;

  const NavLink = ({ href, icon: Icon, label }: { href: string, icon: React.ElementType, label: string }) => {
    const isActive = pathname === href || (href === "/dashboard" && pathname.startsWith("/dashboard"));
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

  return (
    <aside className={cn("flex-col border-r bg-background", isMobile ? "flex w-full" : "hidden md:flex md:w-64")}>
      <div className="flex h-16 items-center border-b px-6">
        <Logo />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <nav className="grid items-start gap-2 p-4 text-sm font-medium">
          {mainNavItems.map((item) => <NavLink key={item.href} {...item} />)}
          
          <div className="my-4 h-px w-full bg-border" />

          {adminNavItems.filter(item => item.roles.includes(user.role)).map((item) => (
             <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="mt-auto p-4 space-y-4">
            <div className="p-2 rounded-lg bg-secondary">
                <h3 className="font-semibold font-headline">Colleagues Online</h3>
                <div className="flex items-center space-x-2 mt-2">
                    {mockUsers.filter(u => u.onlineStatus === 'Online').slice(0, 5).map(u => (
                        <Avatar key={u.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={u.avatarUrl} alt={u.fullName} />
                            <AvatarFallback>{u.fullName[0]}</AvatarFallback>
                        </Avatar>
                    ))}
                    {mockUsers.filter(u => u.onlineStatus === 'Online').length > 5 && (
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            +{mockUsers.filter(u => u.onlineStatus === 'Online').length - 5}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary">
                 <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                    <AvatarFallback>{user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                    <p className="font-semibold">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Link href="/login">
                    <LogOut className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/>
                </Link>
            </div>
        </div>
      </div>
    </aside>
  );
}
