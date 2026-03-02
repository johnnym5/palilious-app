'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { useSimpleAuth } from "@/hooks/use-simple-auth";

export function Announcements() {
    const { user } = useSimpleAuth();
    const canManage = user?.role === 'HR' || user?.role === 'MD';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Announcements</CardTitle>
                {canManage && (
                    <Button variant="ghost" size="sm" disabled>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">Live announcements are temporarily disabled.</p>
                </div>
            </CardContent>
        </Card>
    );
}
