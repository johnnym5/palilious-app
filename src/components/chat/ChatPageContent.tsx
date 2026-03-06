'use client';
import { useState, useEffect } from 'react';
import type { UserProfile, Chat } from '@/lib/types';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareOff, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { CreateChannelDialog } from '@/components/chat/CreateChannelDialog';
import { cn } from '@/lib/utils';

export function ChatPageContent() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]);
    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(currentUserProfile);
    
    const handleSelectConversation = (item: Chat | UserProfile) => {
        if ('participants' in item) { // It's a Chat object
            setSelectedChat(item);
        } else { // It's a UserProfile object, start a new DM
             setSelectedChat({
                id: '', // Temporary
                orgId: currentUserProfile?.orgId || '',
                type: 'DIRECT',
                participants: [currentUserProfile?.id || '', item.id],
                 participantProfiles: {
                    [currentUserProfile?.id || '']: { fullName: currentUserProfile?.fullName || '' },
                    [item.id]: { fullName: item.fullName },
                },
                updatedAt: new Date().toISOString(),
            });
        }
    };


    const isLoading = isProfileLoading;

    if (isLoading) {
        return (
            <div className="h-full flex flex-col p-6">
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

    if (!isProfileLoading && !permissions.canAccessChat) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquareOff className="w-16 h-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold font-headline">Chat is Disabled</h1>
                <p className="text-muted-foreground mt-2">The internal chat system is currently disabled for your account or organization.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-6">Return to Dashboard</Button>
            </div>
       )
    }


    return (
        <div className="h-full flex flex-col p-6">
             <div className="flex items-center justify-between mb-4">
                 <div>
                  <h1 className="text-3xl font-bold font-headline tracking-tight">Internal Messaging</h1>
                  <p className="text-muted-foreground">
                    Create channels or chat privately with team members.
                  </p>
                 </div>
                 {currentUserProfile && (
                     <CreateChannelDialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen} currentUserProfile={currentUserProfile}>
                        <Button variant="outline" onClick={() => setIsCreateChannelOpen(true)}>
                            <PlusCircle className="mr-2" />
                            New Channel
                        </Button>
                     </CreateChannelDialog>
                 )}
             </div>
            <div className="flex-1 flex border bg-card/50 rounded-xl overflow-hidden">
                <div className={cn("w-full md:w-[300px] flex-col border-r", selectedChat ? 'hidden md:flex' : 'flex')}>
                    <ChatSidebar 
                        currentUserProfile={currentUserProfile} 
                        onSelectConversation={handleSelectConversation}
                        selectedChatId={selectedChat?.id}
                    />
                </div>
                <div className={cn("flex-1 flex-col", selectedChat ? 'flex' : 'hidden md:flex')}>
                    <ChatWindow 
                        currentUserProfile={currentUserProfile} 
                        selectedChat={selectedChat}
                        onBack={() => setSelectedChat(null)}
                    />
                </div>
            </div>
        </div>
    );
}
