'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "../ui/scroll-area";
import type { UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { MessageSquare, LifeBuoy } from "lucide-react";
import { RequestAssistanceDialog } from "../tasks/RequestAssistanceDialog";
import { uiEmitter } from '@/lib/ui-emitter';

interface StatusFeedProps {
  userProfile: UserProfile | null;
  permissions: Permissions;
}

export function StatusFeed({ userProfile, permissions }: StatusFeedProps) {
  const firestore = useFirestore();

  // State for assistance dialog
  const [assistanceUser, setAssistanceUser] = useState<UserProfile | null>(null);

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
  
  const handleChat = (userId: string) => {
      uiEmitter.emit('open-chat-dialog', { initialUserId: userId });
  };


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
                      <div key={i} className="flex items-center gap-3 p-2">
                          <Skeleton className="h-3 w-3 rounded-full" />
                          <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                          </div>
                      </div>
                 ))}
                 {!isLoading && sortedUsers.map(user => {
                     if (user.id === userProfile?.id) {
                         // Don't show popover for self
                         return (
                            <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg">
                               <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${user.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-muted'}`} />
                               <div>
                                   <p className="font-medium text-sm text-foreground">{user.fullName} (You)</p>
                                   <p className="text-xs text-muted-foreground">{user.position}</p>
                               </div>
                           </div>
                         );
                     }
                     
                     return (
                        <Popover key={user.id}>
                            <PopoverTrigger asChild>
                                <div className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-secondary cursor-pointer">
                                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${user.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-muted'}`} />
                                    <div>
                                        <p className="font-medium text-sm text-foreground">{user.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{user.position}</p>
                                    </div>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1">
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleChat(user.id)}>
                                    <MessageSquare className="mr-2 h-4 w-4" /> Send Message
                                </Button>
                                <Button variant="ghost" className="w-full justify-start" onClick={() => setAssistanceUser(user)}>
                                    <LifeBuoy className="mr-2 h-4 w-4" /> Request Assistance
                                </Button>
                            </PopoverContent>
                        </Popover>
                 )})}
                  {!isLoading && sortedUsers.length === 0 && (
                       <p className="text-sm text-muted-foreground text-center pt-8">No staff members found.</p>
                  )}
              </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {assistanceUser && userProfile && (
        <RequestAssistanceDialog
            open={!!assistanceUser}
            onOpenChange={(isOpen) => !isOpen && setAssistanceUser(null)}
            targetUser={assistanceUser}
            currentUserProfile={userProfile}
        />
      )}
    </>
  );
}
