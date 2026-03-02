'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { useUser, useDoc, useMemoFirebase } from "@/firebase";
import { UserProfile } from "@/lib/types";
import { doc, getFirestore } from "firebase/firestore";
import { usePermissions } from "@/hooks/usePermissions";

export function Announcements() {
    const { user: authUser } = useUser();
    const firestore = getFirestore();
    
    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, "users", authUser.uid) : null,
    [firestore, authUser]);
    
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Announcements</CardTitle>
                {permissions.canManageStaff && (
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
