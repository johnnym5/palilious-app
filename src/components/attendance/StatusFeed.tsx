'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "../ui/scroll-area";
import type { UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useMemo, useState } from "react";
import { RequestAssistanceDialog } from "../tasks/RequestAssistanceDialog";

interface StatusFeedProps {
  userProfile: UserProfile | null;
  permissions: Permissions;
}

export function StatusFeed({ userProfile, permissions }: StatusFeedProps) {
  const firestore = useFirestore();
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(
      collection(firestore, 'users'),
      where('orgId', '==', userProfile.orgId)
    );
  }, [firestore, userProfile]);

  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      if (a.status === 'ONLINE' && b.status !== 'ONLINE') return -1;
      if (a.status !== 'ONLINE' && b.status === 'ONLINE') return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [users]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Who's In Office?</CardTitle>
          <CardDescription>Live status of all staff members.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
              <div className="space-y-1">
                 {isLoading && Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-2">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                          </div>
                      </div>
                 ))}
                 {!isLoading && sortedUsers.map(user => (
                     <div 
                        key={user.id} 
                        className="flex items-center gap-4 p-2 rounded-lg transition-colors hover:bg-secondary cursor-pointer"
                        onClick={() => {
                          if (user.id !== userProfile?.id) {
                            setTargetUser(user);
                          }
                        }}
                      >
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
      {targetUser && userProfile && (
        <RequestAssistanceDialog
          targetUser={targetUser}
          currentUserProfile={userProfile}
          open={!!targetUser}
          onOpenChange={(isOpen) => !isOpen && setTargetUser(null)}
        />
      )}
    </>
  );
}

    