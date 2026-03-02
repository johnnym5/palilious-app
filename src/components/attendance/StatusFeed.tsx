'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "../ui/scroll-area";
import type { UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useMemo } from "react";

interface StatusFeedProps {
  userProfile: UserProfile | null;
  permissions: Permissions;
}

export function StatusFeed({ userProfile, permissions }: StatusFeedProps) {
  const firestore = useFirestore();

  // Simplified query to avoid composite index requirement
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !permissions.canManageStaff) return null;
    return query(
      collection(firestore, 'users'),
      where('orgId', '==', userProfile.orgId)
    );
  }, [firestore, userProfile, permissions.canManageStaff]);

  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  // Perform sorting on the client-side
  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      // 'ONLINE' users come first
      if (a.status === 'ONLINE' && b.status !== 'ONLINE') {
        return -1;
      }
      if (a.status !== 'ONLINE' && b.status === 'ONLINE') {
        return 1;
      }
      // Then sort by full name alphabetically
      return a.fullName.localeCompare(b.fullName);
    });
  }, [users]);


  if (!permissions.canManageStaff) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Who's In Office?</CardTitle>
                <CardDescription>Live status of all staff members.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground text-center pt-8">This view is only available to managers.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who's In Office?</CardTitle>
        <CardDescription>Live status of all staff members.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
            <div className="space-y-4">
               {isLoading && Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
               ))}
               {!isLoading && sortedUsers.map(user => (
                   <div key={user.id} className="flex items-center gap-4">
                       <Avatar className="relative h-10 w-10">
                            <AvatarImage src={user.avatarURL} alt={user.fullName} />
                            <AvatarFallback>{user.fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                            {user.status === 'ONLINE' && (
                                <div className="absolute -bottom-0.5 -right-0.5 rounded-full h-3.5 w-3.5 bg-background p-0.5">
                                    <div className="h-full w-full rounded-full bg-emerald-500" />
                                </div>
                            )}
                       </Avatar>
                       <div>
                           <p className="font-medium text-sm text-foreground">{user.fullName}</p>
                           <p className="text-xs text-muted-foreground">{user.position}</p>
                       </div>
                   </div>
               ))}
                {!isLoading && sortedUsers.length === 0 && (
                     <p className="text-sm text-muted-foreground text-center pt-8">No staff members found.</p>
                )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
