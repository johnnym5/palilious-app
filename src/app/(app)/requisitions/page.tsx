'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisitionTable } from "@/components/requisitions/RequisitionTable";
import { useState, useEffect } from "react";
import { NewRequisitionDialog } from "@/components/requisitions/NewRequisitionDialog";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Requisition, UserProfile } from "@/lib/types";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { usePermissions, type Permissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RequisitionDetailDialog } from "@/components/requisitions/RequisitionDetailDialog";
import { useSystemConfig } from "@/hooks/useSystemConfig";


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
    
    const orderedTabs = ["My Requests", "Inbox", "All", "Pending", "Approved", "Paid", "Rejected"];
    return orderedTabs.filter(tab => tabs.has(tab));
};


export default function RequisitionsPage() {
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { isSuperAdmin } = useSuperAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedRequest, setSelectedRequest] = useState<Requisition | null>(null);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  const { config: systemConfig } = useSystemConfig(userProfile?.orgId);

  const reqIdFromUrl = searchParams.get('reqId');
  const reqFromUrlRef = useMemoFirebase(() => 
    reqIdFromUrl ? doc(firestore, 'requisitions', reqIdFromUrl) : null
  , [firestore, reqIdFromUrl]);
  const { data: reqFromUrl } = useDoc<Requisition>(reqFromUrlRef);

  useEffect(() => {
    if (reqFromUrl) {
      setSelectedRequest(reqFromUrl);
    }
  }, [reqFromUrl]);
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedRequest(null);
      // Remove query param from URL without reloading
      router.replace(pathname, {scroll: false}); 
    }
  }

  const isStaff = !permissions.canApproveHR && !permissions.canApproveFinance && !permissions.canApproveMD && !permissions.canManageStaff;
  const visibleTabs = getVisibleTabs(permissions, isStaff);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]);
  
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
        setActiveTab(visibleTabs[0] || "My Requests");
    }
  }, [visibleTabs, activeTab]);

  if (!isProfileLoading && !permissions.canAccessRequisitions) {
    return (
         <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
            <p className="text-muted-foreground mt-2">The financial requisitions module is currently disabled for your account or organization.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-6">Return to Dashboard</Button>
          </div>
    )
  }

  const currencySymbol = systemConfig?.currency_symbol || '$';

  return (
    <div className="space-y-6 min-h-[calc(100vh-10rem)]">
      {isProfileLoading ? (
        <Skeleton className="h-[calc(100vh-12rem)] w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
                <CardTitle>Requisition Portal</CardTitle>
                <CardDescription>Manage all financial requisitions.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className={`grid w-full grid-cols-${visibleTabs.length}`}>
                        {visibleTabs.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
                    </TabsList>
                    {visibleTabs.map(tab => (
                        <TabsContent key={tab} value={tab} className="mt-4">
                            <RequisitionTable 
                              filter={tab} 
                              userProfile={userProfile} 
                              isSuperAdmin={isSuperAdmin} 
                              permissions={permissions} 
                              onSelectRequest={setSelectedRequest}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
          </Card>

          <>
            <Button 
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg shadow-primary/30 z-40" 
                onClick={() => setIsNewRequestOpen(true)}
                aria-label="New Requisition"
            >
              <Plus className="h-8 w-8" />
            </Button>
            <NewRequisitionDialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen} userProfile={userProfile} />
          </>

          {selectedRequest && userProfile && (
                <RequisitionDetailDialog
                    requisition={selectedRequest}
                    isOpen={!!selectedRequest}
                    onOpenChange={handleDialogClose}
                    currentUserProfile={userProfile}
                    isSuperAdmin={isSuperAdmin}
                    permissions={permissions}
                    currencySymbol={currencySymbol}
                />
            )}
        </>
      )}
    </div>
  );
}
