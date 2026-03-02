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
import { usePermissions, type Permissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";

const getVisibleTabs = (permissions: Permissions, isStaff: boolean) => {
    const tabs = new Set<string>();

    if (isStaff) {
        tabs.add("My Requests");
    }

    if (permissions.canApproveHR || permissions.canApproveFinance || permissions.canApproveMD) {
        tabs.add("Inbox");
    }

    if (permissions.canManageStaff) { // For Org Admins, Super Admins, etc.
        tabs.add("All");
        tabs.add("Pending");
        tabs.add("Approved");
        tabs.add("Paid");
        tabs.add("Rejected");
    } else { // Staff members see a simplified view
        tabs.add("Pending");
        tabs.add("Approved");
        tabs.add("Rejected");
    }
    
    // A consistent order for the tabs
    const orderedTabs = ["My Requests", "Inbox", "All", "Pending", "Approved", "Paid", "Rejected"];
    return orderedTabs.filter(tab => tabs.has(tab));
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

  const permissions = usePermissions(userProfile);
  // A "staff" user is defined as someone without any special requisition approval or management permissions.
  const isStaff = !permissions.canApproveHR && !permissions.canApproveFinance && !permissions.canApproveMD && !permissions.canManageStaff;
  const visibleTabs = getVisibleTabs(permissions, isStaff);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]);
  
  // Effect to reset tab if it's no longer visible after profile loads
  useState(() => {
    if (!visibleTabs.includes(activeTab)) {
        setActiveTab(visibleTabs[0] || "My Requests");
    }
  });

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
                        <RequisitionTable filter={tab} userProfile={userProfile} isSuperAdmin={isSuperAdmin} permissions={permissions} />
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
