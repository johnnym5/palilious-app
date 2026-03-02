'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisitionTable } from "@/components/requisitions/RequisitionTable";
import { useState } from "react";
import { NewRequisitionDialog } from "@/components/requisitions/NewRequisitionDialog";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Skeleton } from "@/components/ui/skeleton";

type UserRoleType = UserProfile['role'] | 'SUPER_ADMIN';

const TABS: Record<UserRoleType, string[]> = {
  STAFF: ["My Requests", "Pending", "Approved", "Rejected"],
  HR: ["Inbox", "Approved", "Rejected", "All"],
  FINANCE: ["Inbox", "Approved", "Paid", "Rejected", "All"],
  MD: ["Inbox", "Approved", "Rejected", "All"],
  ORG_ADMIN: ["All", "Pending", "Approved", "Paid", "Rejected"],
  SUPER_ADMIN: ["All", "Pending", "Approved", "Paid", "Rejected"],
};

const getVisibleTabs = (role?: UserRoleType) => {
  if (!role) return TABS.STAFF;
  return TABS[role] || TABS.STAFF;
};

export default function RequisitionsPage() {
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { isSuperAdmin } = useSuperAdmin();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const role = isSuperAdmin ? 'SUPER_ADMIN' : userProfile?.role;
  const visibleTabs = getVisibleTabs(role);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]);

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
      <Card>
        <CardHeader>
            <CardTitle>Requisition Portal</CardTitle>
            <CardDescription>Manage all financial requisitions.</CardDescription>
        </CardHeader>
        <CardContent>
            {isProfileLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={`grid w-full grid-cols-${visibleTabs.length}`}>
                    {visibleTabs.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
                </TabsList>
                {visibleTabs.map(tab => (
                    <TabsContent key={tab} value={tab} className="mt-4">
                        <RequisitionTable filter={tab} userProfile={userProfile} isSuperAdmin={isSuperAdmin} />
                    </TabsContent>
                ))}
            </Tabs>
            )}
        </CardContent>
      </Card>

      <NewRequisitionDialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <Button 
            className="absolute bottom-0 right-0 h-16 w-16 rounded-full shadow-lg shadow-primary/30" 
            onClick={() => setIsNewRequestOpen(true)}
            aria-label="New Requisition"
        >
          <Plus className="h-8 w-8" />
        </Button>
      </NewRequisitionDialog>
    </div>
  );
}
