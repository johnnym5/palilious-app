"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile } from '@/lib/types';
import { TeamPane } from './TeamPane';
import { SystemPane } from './SystemPane';
import { usePermissions } from '@/hooks/usePermissions';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

export function SettingsDialog({ open, onOpenChange, userProfile }: SettingsDialogProps) {
  const permissions = usePermissions(userProfile);
  const router = useRouter();

  if (!permissions.canManageStaff) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                 <DialogHeader className="items-center text-center">
                    <div className="p-3 rounded-full bg-destructive/10 mb-4">
                        <ShieldAlert className="w-10 h-10 text-destructive" />
                    </div>
                    <DialogTitle className="text-2xl">Access Denied</DialogTitle>
                    <DialogDescription>
                        You do not have permission to access organization settings.
                    </DialogDescription>
                 </DialogHeader>
                 <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} className="w-full">Close</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your organization's team members and system configuration.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="team" className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="team" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
            <TeamPane currentUserProfile={userProfile} />
          </TabsContent>
          <TabsContent value="system" className="flex-1 overflow-y-auto mt-4 px-6 pb-6">
            <SystemPane currentUserProfile={userProfile} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
