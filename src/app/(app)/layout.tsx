'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { hexToHslString } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import AppSidebar from '@/components/layout/AppSidebar';
import AppHeader from '@/components/layout/AppHeader';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { WorkbookDialog } from '@/components/workbook/WorkbookDialog';
import { RequisitionsDialog } from '@/components/requisitions/RequisitionsDialog';
import { TasksDialog } from '@/components/tasks/TasksDialog';
import { AttendanceDialog } from '@/components/attendance/AttendanceDialog';
import { ChatDialog } from '@/components/chat/ChatDialog';
import { LeaveDialog } from '@/components/leave/LeaveDialog';
import { ReportsDialog } from '@/components/reports/ReportsDialog';
import { uiEmitter } from '@/lib/ui-emitter';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { theme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWorkbookOpen, setIsWorkbookOpen] = useState(false);
  const [isRequisitionsOpen, setIsRequisitionsOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const { config, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
  
  useEffect(() => {
    const root = document.documentElement;
    const defaultPrimary = '217.2 91.2% 59.8%';
    const defaultAccent = '217.2 32.6% 17.5%';
    
    // Set Primary Color
    if (config?.branding_color) {
      const hslString = hexToHslString(config.branding_color);
      if (hslString) {
        root.style.setProperty('--primary', hslString);
      }
    } else {
      root.style.setProperty('--primary', defaultPrimary);
    }

    // Set Accent Color
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
    uiEmitter.on('open-reports-dialog', openReports);
    return () => {
      uiEmitter.off('open-reports-dialog', openReports);
    };
  }, []);


  if (isUserLoading || !user || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen w-full bg-muted/40">
          <AppSidebar 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            onOpenWorkbooks={() => setIsWorkbookOpen(true)} 
            onOpenRequisitions={() => setIsRequisitionsOpen(true)}
            onOpenTasks={() => setIsTasksOpen(true)}
            onOpenAttendance={() => setIsAttendanceOpen(true)}
            onOpenChat={() => setIsChatOpen(true)}
            onOpenLeave={() => setIsLeaveOpen(true)}
            onOpenReports={() => setIsReportsOpen(true)}
          />
          <div className="flex flex-1 flex-col">
              <AppHeader />
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 bg-background">
                  {children}
              </main>
          </div>
          <BottomNavBar />
      </div>
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <WorkbookDialog open={isWorkbookOpen} onOpenChange={setIsWorkbookOpen} />
      <RequisitionsDialog open={isRequisitionsOpen} onOpenChange={setIsRequisitionsOpen} />
      <TasksDialog open={isTasksOpen} onOpenChange={setIsTasksOpen} />
      <AttendanceDialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen} />
      <ChatDialog open={isChatOpen} onOpenChange={setIsChatOpen} />
      <LeaveDialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen} />
      <ReportsDialog open={isReportsOpen} onOpenChange={setIsReportsOpen} />
    </>
  );
}
