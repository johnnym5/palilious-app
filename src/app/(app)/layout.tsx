'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ListTodo, FileText, CalendarPlus, BookOpenCheck, Plus, UserPlus } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { hexToHslString } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import AppSidebar from '@/components/layout/AppSidebar';
import AppHeader from '@/components/layout/AppHeader';
import { WorkbookDialog } from '@/components/workbook/WorkbookDialog';
import { RequisitionsDialog } from '@/components/requisitions/RequisitionsDialog';
import { TasksDialog } from '@/components/tasks/TasksDialog';
import { AttendanceDialog } from '@/components/attendance/AttendanceDialog';
import { LeaveDialog } from '@/components/leave/LeaveDialog';
import { ReportsDialog } from '@/components/reports/ReportsDialog';
import { uiEmitter } from '@/lib/ui-emitter';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AssignTaskDialog } from '@/components/tasks/AssignTaskDialog';
import { NewRequisitionDialog } from '@/components/requisitions/NewRequisitionDialog';
import { RequestLeaveDialog } from '@/components/leave/RequestLeaveDialog';
import { NewWorkbookDialog } from '@/components/workbook/NewWorkbookDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { ChatDialog } from '@/components/chat/ChatDialog';
import { InviteUserDialog } from '@/components/settings/InviteUserDialog';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { theme } = useTheme();
  const [isWorkbookOpen, setIsWorkbookOpen] = useState(false);
  const [isRequisitionsOpen, setIsRequisitionsOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isNewRequisitionOpen, setIsNewRequisitionOpen] = useState(false);
  const [isRequestLeaveOpen, setIsRequestLeaveOpen] = useState(false);
  const [isNewWorkbookOpen, setIsNewWorkbookOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);
  const { config, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    const root = document.documentElement;
    const defaultPrimary = '217.2 91.2% 59.8%';
    const defaultAccent = '217.2 32.6% 17.5%';
    
    if (config?.branding_color) {
      const hslString = hexToHslString(config.branding_color);
      if (hslString) {
        root.style.setProperty('--primary', hslString);
      }
    } else {
      root.style.setProperty('--primary', defaultPrimary);
    }

    if (config?.accent_color) {
      const hslString = hexToHslString(config.accent_color);
      if (hslString) {
        root.style.setProperty('--accent', hslString);
      }
    } else {
      root.style.setProperty('--accent', defaultAccent);
    }

  }, [config, theme]);

  useEffect(() => {
    const openReports = () => setIsReportsOpen(true);
    const openProfile = () => setIsProfileOpen(true);
    const openSettings = () => setIsSettingsOpen(true);
    const openChat = () => setIsChatOpen(true);
    const openTasks = () => setIsTasksOpen(true);
    const openWorkbooks = () => setIsWorkbookOpen(true);
    const openRequisitions = () => setIsRequisitionsOpen(true);
    const openAttendance = () => setIsAttendanceOpen(true);
    const openLeave = () => setIsLeaveOpen(true);
    const openAssignTask = () => setIsAssignTaskOpen(true);
    const openNewRequisition = () => setIsNewRequisitionOpen(true);
    const openNewWorkbook = () => setIsNewWorkbookOpen(true);
    const openInviteUser = () => setIsInviteUserOpen(true);


    uiEmitter.on('open-reports-dialog', openReports);
    uiEmitter.on('open-profile-dialog', openProfile);
    uiEmitter.on('open-settings-dialog', openSettings);
    uiEmitter.on('open-chat-dialog', openChat);
    uiEmitter.on('open-tasks-dialog', openTasks);
    uiEmitter.on('open-workbooks-dialog', openWorkbooks);
    uiEmitter.on('open-requisitions-dialog', openRequisitions);
    uiEmitter.on('open-attendance-dialog', openAttendance);
    uiEmitter.on('open-leave-dialog', openLeave);
    uiEmitter.on('open-assign-task-dialog', openAssignTask);
    uiEmitter.on('open-new-requisition-dialog', openNewRequisition);
    uiEmitter.on('open-new-workbook-dialog', openNewWorkbook);
    uiEmitter.on('open-invite-user-dialog', openInviteUser);
    
    return () => {
      uiEmitter.off('open-reports-dialog', openReports);
      uiEmitter.off('open-profile-dialog', openProfile);
      uiEmitter.off('open-settings-dialog', openSettings);
      uiEmitter.off('open-chat-dialog', openChat);
      uiEmitter.off('open-tasks-dialog', openTasks);
      uiEmitter.off('open-workbooks-dialog', openWorkbooks);
      uiEmitter.off('open-requisitions-dialog', openRequisitions);
      uiEmitter.off('open-attendance-dialog', openAttendance);
      uiEmitter.off('open-leave-dialog', openLeave);
      uiEmitter.off('open-assign-task-dialog', openAssignTask);
      uiEmitter.off('open-new-requisition-dialog', openNewRequisition);
      uiEmitter.off('open-new-workbook-dialog', openNewWorkbook);
      uiEmitter.off('open-invite-user-dialog', openInviteUser);
    };
  }, []);


  if (isUserLoading || !user || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  const dialogManager = {
    workbooks: setIsWorkbookOpen,
    requisitions: setIsRequisitionsOpen,
    tasks: setIsTasksOpen,
    attendance: setIsAttendanceOpen,
    leave: setIsLeaveOpen,
    reports: setIsReportsOpen,
    profile: setIsProfileOpen,
    newWorkbook: setIsNewWorkbookOpen,
    newRequisition: setIsNewRequisitionOpen,
    assignTask: setIsAssignTaskOpen,
    requestLeave: setIsRequestLeaveOpen,
    chat: setIsChatOpen,
    settings: setIsSettingsOpen,
    inviteUser: setIsInviteUserOpen,
  };


  return (
    <>
      <div className="flex min-h-screen w-full bg-muted/40">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
              <AppHeader />
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 bg-background">
                  {children}
              </main>
          </div>
          <BottomNavBar dialogManager={dialogManager}/>
      </div>

       {/* Desktop FAB */}
      <div className="hidden md:block">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg z-40">
                    <Plus className="h-8 w-8" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end">
                {permissions.canManageStaff && (
                    <DropdownMenuItem onSelect={() => setIsInviteUserOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        <span>Add Team Member</span>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setIsAssignTaskOpen(true)}>
                    <ListTodo className="mr-2 h-4 w-4" />
                    <span>New Task</span>
                </DropdownMenuItem>
                {permissions.canAccessRequisitions && (
                    <DropdownMenuItem onSelect={() => setIsNewRequisitionOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>New Requisition</span>
                    </DropdownMenuItem>
                )}
                 <DropdownMenuItem onSelect={() => setIsRequestLeaveOpen(true)}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    <span>Request Leave</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsNewWorkbookOpen(true)}>
                    <BookOpenCheck className="mr-2 h-4 w-4" />
                    <span>New Workbook</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Feature Dialogs */}
      <WorkbookDialog open={isWorkbookOpen} onOpenChange={setIsWorkbookOpen} />
      <RequisitionsDialog open={isRequisitionsOpen} onOpenChange={setIsRequisitionsOpen} />
      <TasksDialog open={isTasksOpen} onOpenChange={setIsTasksOpen} />
      <AttendanceDialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen} />
      <LeaveDialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen} />
      <ReportsDialog open={isReportsOpen} onOpenChange={setIsReportsOpen} />
      {userProfile && <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} userProfile={userProfile} />}
      {userProfile && <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} userProfile={userProfile} />}
      {userProfile && <ChatDialog open={isChatOpen} onOpenChange={setIsChatOpen} currentUserProfile={userProfile} />}

      {/* Creation Dialogs */}
      {userProfile && (
        <>
            <AssignTaskDialog open={isAssignTaskOpen} onOpenChange={setIsAssignTaskOpen} currentUserProfile={userProfile} permissions={permissions} initialData={null} />
            <NewRequisitionDialog open={isNewRequisitionOpen} onOpenChange={setIsNewRequisitionOpen} userProfile={userProfile} />
            <RequestLeaveDialog open={isRequestLeaveOpen} onOpenChange={setIsRequestLeaveOpen} userProfile={userProfile} />
            <NewWorkbookDialog open={isNewWorkbookOpen} onOpenChange={setIsNewWorkbookOpen} userProfile={userProfile} />
            <InviteUserDialog open={isInviteUserOpen} onOpenChange={setIsInviteUserOpen} currentUserProfile={userProfile} />
        </>
      )}
    </>
  );
}
