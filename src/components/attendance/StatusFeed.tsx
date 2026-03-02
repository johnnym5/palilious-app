'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";

export function StatusFeed() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('status'));
  }, [firestore]);

  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  const getStatusVariant = (status: string | undefined) => {
    switch (status) {
        case 'ONLINE': return 'default';
        case 'ON_LEAVE': return 'secondary';
        default: return 'outline';
    }
  }
   const getStatusRingColor = (status: string | undefined) => {
    switch (status) {
        case 'ONLINE': return 'border-green-500';
        case 'ON_LEAVE': return 'border-yellow-500';
        default: return 'border-gray-500';
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Who's In Office?</CardTitle>
        <CardDescription>Live status of all staff members.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
            <div className="space-y-4">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="ml-4 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                </div>
                </div>
            ))}
            {users?.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Avatar className={`h-9 w-9 border-2 ${getStatusRingColor(user.status)}`}>
                            <AvatarImage src={user.avatarURL} alt={user.fullName} />
                            <AvatarFallback>{user.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">{user.fullName}</p>
                            <p className="text-sm text-muted-foreground">{user.role}</p>
                        </div>
                    </div>
                    <Badge variant={getStatusVariant(user.status)}>{user.status || 'OFFLINE'}</Badge>
                </div>
            ))}
            {!isLoading && users?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">No users found.</p>
            )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
