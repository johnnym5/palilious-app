"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile } from '@/lib/types';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

// Basic placeholder panes for now
const TeamPane = () => (
    <div className="p-4">
        <h3 className="font-semibold mb-2">Team Management</h3>
        <p className="text-sm text-muted-foreground">User listing and invitation features will be implemented here.</p>
    </div>
);

const SystemPane = () => (
    <div className="p-4">
        <h3 className="font-semibold mb-2">System Settings</h3>
        <p className="text-sm text-muted-foreground">Configuration for branding and system toggles will be implemented here.</p>
    </div>
);


export function SettingsDialog({ open, onOpenChange, userProfile }: SettingsDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your organization's team members and system configuration.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="team" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          <TabsContent value="team" className="flex-1 overflow-y-auto mt-4">
            <TeamPane />
          </TabsContent>
          <TabsContent value="system" className="flex-1 overflow-y-auto mt-4">
            <SystemPane />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
