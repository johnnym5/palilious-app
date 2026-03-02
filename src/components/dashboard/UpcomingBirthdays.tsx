import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockBirthdays } from "@/lib/placeholder-data";
import { Cake } from "lucide-react";

export function UpcomingBirthdays() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-primary" />
            Upcoming Birthdays
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockBirthdays.map((person) => (
            <div key={person.fullName} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarImage src={person.avatarUrl} alt={person.fullName} />
                <AvatarFallback>{person.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{person.fullName}</p>
                <p className="text-sm text-muted-foreground">{person.birthday}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
