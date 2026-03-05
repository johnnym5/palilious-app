'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake } from "lucide-react";

export function TodaysCelebrations() {
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
           <p className="text-sm text-muted-foreground text-center">Live birthday data is temporarily disabled.</p>
        </div>
      </CardContent>
    </Card>
  );
}
