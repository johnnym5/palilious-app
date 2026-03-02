'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { format, isToday } from "date-fns";
import { Skeleton } from "../ui/skeleton";

export function TodaysCelebrations() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  const todaysBirthdays = (users || [])
    .filter(u => u.birthday && isToday(new Date(u.birthday)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-primary" />
            Celebrating Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading && Array.from({ length: 1 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="ml-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
          {todaysBirthdays.map((person) => (
            <div key={person.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarImage src={person.avatarURL} alt={person.fullName} />
                <AvatarFallback>{person.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{person.fullName}</p>
                <p className="text-sm text-muted-foreground">Happy Birthday!</p>
              </div>
            </div>
          ))}
          {!isLoading && todaysBirthdays.length === 0 && (
             <p className="text-sm text-muted-foreground text-center">No birthdays today.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
