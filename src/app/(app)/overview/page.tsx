'use client';
import { StatCard } from "@/components/dashboard/StatCard";
import { CheckCircle, Megaphone, BookOpenCheck, FilePlus2, ListTodo, UserPlus } from "lucide-react";
import { ActiveTasks } from "@/components/dashboard/ActiveTasks";
import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import type { UserProfile, Requisition, Announcement, SystemConfig } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect } from "react";
import { Announcements } from "@/components/dashboard/Announcements";
import { usePermissions, type Permissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { NewAnnouncementDialog } from "@/components/dashboard/NewAnnouncementDialog";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { ClockControl } from "@/components/attendance/ClockControl";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import Link from 'next/link';
import { uiEmitter } from '@/lib/ui-emitter';

// Local component for the ClockIn slide
const ClockInCard = ({ userProfile, permissions, systemConfig }: { userProfile: UserProfile | null; permissions: Permissions; systemConfig: SystemConfig | null }) => {
  return (
    <div className="h-full">
       <ClockControl 
        userProfile={userProfile} 
        permissions={permissions} 
        systemConfig={systemConfig}
        className="bg-primary/90 text-primary-foreground h-full"
      />
    </div>
  );
};

// Local component for the Announcement slide
const LatestAnnouncementCard = ({ userProfile }: { userProfile: UserProfile | null }) => {
  const firestore = useFirestore();
  const announcementQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(
      collection(firestore, 'announcements'),
      where('orgId', '==', userProfile.orgId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore, userProfile]);

  const { data: announcements, isLoading } = useCollection<Announcement>(announcementQuery);
  const latestAnnouncement = announcements?.[0];

  return (
    <Card className="h-full flex flex-col bg-primary/90 text-primary-foreground">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-wider uppercase">Latest Announcement</CardTitle>
            <Megaphone className="h-5 w-5 text-primary-foreground/70" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center text-center">
        {isLoading ? <Skeleton className="w-full h-24 bg-white/20" /> : latestAnnouncement ? (
          <div>
            <h3 className="text-3xl font-bold font-headline">{latestAnnouncement.title}</h3>
            <p className="text-primary-foreground/80 line-clamp-2 mt-2">{latestAnnouncement.content}</p>
          </div>
        ) : (
          <p className="text-primary-foreground/80">No announcements right now.</p>
        )}
      </CardContent>
    </Card>
  );
};

// Local component for Quick Actions
const QuickActionsCard = ({ permissions }: { permissions: Permissions }) => {
  return (
    <Card className="bg-primary/90 text-primary-foreground h-full flex flex-col">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription className="text-primary-foreground/80">Your most common tasks, just a click away.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow grid grid-cols-2 sm:grid-cols-2 gap-4 items-center">
        {permissions.canManageStaff && (
             <Button variant="secondary" size="lg" className="flex-col h-auto py-4 w-full bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30" onClick={() => uiEmitter.emit('open-invite-user-dialog')}>
                <UserPlus className="h-6 w-6 mb-2" />
                <span className="font-semibold">Add Member</span>
            </Button>
        )}
        <Button variant="secondary" size="lg" className="flex-col h-auto py-4 w-full bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30" onClick={() => uiEmitter.emit('open-assign-task-dialog')}>
          <ListTodo className="h-6 w-6 mb-2" />
          <span className="font-semibold">Add a Task</span>
        </Button>
        <Button variant="secondary" size="lg" className="flex-col h-auto py-4 w-full bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30" onClick={() => uiEmitter.emit('open-new-workbook-dialog')}>
          <BookOpenCheck className="h-6 w-6 mb-2" />
          <span className="font-semibold">New Workbook</span>
        </Button>
        {permissions.canAccessRequisitions && (
          <Button variant="secondary" size="lg" className="flex-col h-auto py-4 w-full bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30" onClick={() => uiEmitter.emit('open-new-requisition-dialog')}>
            <FilePlus2 className="h-6 w-6 mb-2" />
            <span className="font-semibold">New Requisition</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};


export default function OverviewPage() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const [isNewAnnouncementOpen, setIsNewAnnouncementOpen] = useState(false);
    const [api, setApi] = useState<CarouselApi>()

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null, 
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);
    const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);

    // Fetch pending approvals for requisitions
    const reqsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        const inboxStatuses: string[] = [];
        if (permissions.canApproveHR) inboxStatuses.push('PENDING_HR');
        if (permissions.canApproveFinance) inboxStatuses.push('PENDING_FINANCE');
        if (permissions.canApproveMD) inboxStatuses.push('PENDING_MD');
        if (permissions.canDisburse) inboxStatuses.push('APPROVED'); // Finance can also see approved to pay them
        
        if (inboxStatuses.length === 0) return null;
        
        return query(
            collection(firestore, 'requisitions'),
            where('orgId', '==', userProfile.orgId),
            where('status', 'in', [...new Set(inboxStatuses)])
        );
    }, [firestore, userProfile, permissions]);
    const { data: pendingReqs, isLoading: reqsLoading } = useCollection<Requisition>(reqsQuery);
    
     useEffect(() => {
        if (!api) {
          return
        }
    
        const interval = setInterval(() => {
            if (api.canScrollNext()) {
                api.scrollNext()
            } else {
                api.scrollTo(0)
            }
        }, 30000) // 30 seconds
    
        return () => clearInterval(interval)
      }, [api])


    const isLoading = isProfileLoading || reqsLoading || isConfigLoading;

    return (
        <div className="flex flex-col gap-8">
             {isLoading ? (
                <Skeleton className="h-[218px] w-full" />
             ) : (
                <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
                    <CarouselContent className="-ml-4">
                        <CarouselItem className="pl-4">
                            <ClockInCard userProfile={userProfile} permissions={permissions} systemConfig={systemConfig} />
                        </CarouselItem>
                         <CarouselItem className="pl-4">
                            <LatestAnnouncementCard userProfile={userProfile} />
                        </CarouselItem>
                        <CarouselItem className="pl-4">
                            <QuickActionsCard permissions={permissions} />
                        </CarouselItem>
                    </CarouselContent>
                </Carousel>
             )}

            <ActiveTasks />

            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold font-headline">Recent Updates</h2>
                    {userProfile && permissions.canManageAnnouncements && (
                        <NewAnnouncementDialog 
                            open={isNewAnnouncementOpen}
                            onOpenChange={setIsNewAnnouncementOpen}
                            userProfile={userProfile}
                        >
                            <Button variant="outline" size="sm" onClick={() => setIsNewAnnouncementOpen(true)}>
                                <Megaphone className="mr-2 h-4 w-4"/>
                                New Announcement
                            </Button>
                        </NewAnnouncementDialog>
                    )}
                 </div>
                <div className="grid grid-cols-1 gap-4">
                     {isLoading ? (
                        <>
                            <Skeleton className="h-24" />
                        </>
                    ) : (
                        <>
                            <StatCard 
                                title="Pending Approvals" 
                                value={pendingReqs?.length || 0} 
                                icon={CheckCircle}
                                href="/requisitions"
                                color="bg-emerald-500/20 text-emerald-400"
                            />
                        </>
                    )}
                </div>
            </div>

            <Announcements />
        </div>
    );
}
