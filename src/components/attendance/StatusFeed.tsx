'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "../ui/scroll-area";

export function StatusFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Who's In Office?</CardTitle>
        <CardDescription>Live status of all staff members.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">Live status is temporarily disabled.</p>
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
