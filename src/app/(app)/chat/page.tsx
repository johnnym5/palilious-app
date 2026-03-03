'use client';
import { useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { ShieldAlert, MessageSquareOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]);
    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(currentUserProfile?.orgId);


    if (isProfileLoading || isConfigLoading) {
        return (
            <div className="h-full flex flex-col">
                 <div className="flex items-center justify-between mb-4">
                     <div>
                      <Skeleton className="h-8 w-48 mb-2" />
                      <Skeleton className="h-5 w-64" />
                     </div>
                 </div>
                <div className="flex-1 flex border bg-card/50 rounded-xl overflow-hidden">
                    <div className="w-[300px] border-r">
                        <Skeleton className="h-full w-full" />
                    </div>
                    <div className="flex-1">
                        <Skeleton className="h-full w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (!isConfigLoading && systemConfig?.chat_enabled === false) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquareOff className="w-16 h-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold font-headline">Chat is Disabled</h1>
                <p className="text-muted-foreground mt-2">The internal chat system is currently disabled by your organization.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-6">Return to Dashboard</Button>
            </div>
       )
    }


    return (
        <div className="h-full flex flex-col">
             <div className="flex items-center justify-between mb-4">
                 <div>
                  <h1 className="text-3xl font-bold font-headline tracking-tight">Direct Messages</h1>
                  <p className="text-muted-foreground">
                    Chat privately with members of your team.
                  </p>
                 </div>
             </div>
            <div className="flex-1 flex border bg-card/50 rounded-xl overflow-hidden">
                <ChatSidebar 
                    currentUserProfile={currentUserProfile} 
                    onSelectUser={setSelectedUser}
                    selectedUser={selectedUser}
                />
                <ChatWindow 
                    currentUserProfile={currentUserProfile} 
                    selectedUser={selectedUser} 
                />
            </div>
        </div>
    );
}
