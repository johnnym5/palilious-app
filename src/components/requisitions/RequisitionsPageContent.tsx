'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisitionTable } from "@/components/requisitions/RequisitionTable";
import { useState, useEffect } from "react";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Requisition, UserProfile } from "@/lib/types";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { usePermissions, type Permissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RequisitionDetailDialog } from "@/components/requisitions/RequisitionDetailDialog";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { NewRequisitionDialog } from "@/components/requisitions/NewRequisitionDialog";


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


export function RequisitionsPageContent() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { isSuperAdmin } = useSuperAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedRequest, setSelectedRequest] = useState<Requisition | null>(null);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null
  , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  const { config: systemConfig } = useSystemConfig(userProfile?.orgId);

  const reqIdFromUrl = searchParams.get('reqId');
  const reqFromUrlRef = useMemoFirebase(() => 
    firestore && reqIdFromUrl ? doc(firestore, 'requisitions', reqIdFromUrl) : null
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
  
  const storageKey = 'requisitions-active-tab';
  const [activeTab, setActiveTab] = useState(() => {
      if (typeof window !== 'undefined') {
          const savedTab = localStorage.getItem(storageKey);
          if (savedTab && visibleTabs.includes(savedTab)) {
              return savedTab;
          }
      }
      return visibleTabs[0] || 'My Requests';
  });
  
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
        setActiveTab(visibleTabs[0] || "My Requests");
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab]);


  if (!isProfileLoading && !permissions.canAccessRequisitions) {
    return (
         <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
            <p className="text-muted-foreground mt-2">The financial requisitions module is currently disabled for your account or organization.</p>
            <Button onClick={() => router.push('/overview')} className="mt-6">Return to Overview</Button>
          </div>
    )
  }

  const currencySymbol = systemConfig?.currency_symbol || '$';

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Requisitions</h1>
                <p className="text-muted-foreground">Manage all financial requisitions.</p>
            </div>
            <NewRequisitionDialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen} userProfile={userProfile}>
                <Button onClick={() => setIsNewRequestOpen(true)}>
                    <PlusCircle className="mr-2"/>
                    New Requisition
                </Button>
            </NewRequisitionDialog>
        </div>
      {isProfileLoading ? (
        <Skeleton className="h-[calc(100vh-12rem)] w-full" />
      ) : (
        <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <ScrollArea className="w-full pb-2 whitespace-nowrap">
                    <TabsList>
                        {visibleTabs.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
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
