'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export function LeaveBalanceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Leave Balance</CardTitle>
        <CardDescription>Your available days for the current year.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">15</p>
                <p className="text-sm text-muted-foreground">Annual</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">10</p>
                <p className="text-sm text-muted-foreground">Sick</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">2</p>
                <p className="text-sm text-muted-foreground">Unpaid</p>
            </div>
             <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-3xl font-bold font-headline">27</p>
                <p className="text-sm text-muted-foreground">Total</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
