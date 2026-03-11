'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2, Building, Users, LogOut, Bell } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Organization, UserProfile, Feedback } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from '@/components/Logo';
import { FeedbackViewer } from '@/components/superadmin/FeedbackViewer';
import { DataManagement } from '@/components/superadmin/DataManagement';
import { ErrorLogViewer } from '@/components/superadmin/ErrorLogViewer';

interface OrgStats {
    userCount: number;
}

export default function SuperAdminPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const { isSuperAdmin } = useSuperAdmin();
    const router = useRouter();
    const firestore = useFirestore();

    const [orgStats, setOrgStats] = useState<Record<string, OrgStats>>({});
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [showFeedback, setShowFeedback] = useState(false);

    const orgsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'organizations');
    }, [firestore]);
    const { data: organizations, isLoading: areOrgsLoading } = useCollection<Organization>(orgsQuery);
    
    const newFeedbackQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'feedback'), where('status', '==', 'NEW'));
    }, [firestore]);
    const { data: newFeedback } = useCollection<Feedback>(newFeedbackQuery);

    useEffect(() => {
        if (!isUserLoading && user && !isSuperAdmin) {
            router.replace('/');
        }
         if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [user, isUserLoading, isSuperAdmin, router]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!firestore || !organizations || organizations.length === 0) {
                setIsStatsLoading(false);
                return;
            };

            const usersSnapshot = await getDocs(collection(firestore, 'users'));
            const usersByOrg: Record<string, number> = {};
            usersSnapshot.forEach(doc => {
                const user = doc.data() as UserProfile;
                usersByOrg[user.orgId] = (usersByOrg[user.orgId] || 0) + 1;
            });
            
            const stats: Record<string, OrgStats> = {};
            organizations.forEach(org => {
                stats[org.id] = {
                    userCount: usersByOrg[org.id] || 0
                };
            });

            setOrgStats(stats);
            setIsStatsLoading(false);
        };

        if (!areOrgsLoading) {
            fetchStats();
        }

    }, [organizations, areOrgsLoading, firestore]);

    if (isUserLoading || !isSuperAdmin) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary w-12 h-12" />
            </div>
        );
    }

    const isLoading = areOrgsLoading || isStatsLoading;

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 md:px-6 backdrop-blur-lg">
                <Logo />
                <div className="flex-1 hidden md:block">
                    <h1 className="text-lg font-semibold font-headline">Super Admin Console</h1>
                </div>
                <div className="flex-1 md:hidden" />
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setShowFeedback(true)} className="relative px-2 md:px-4">
                        <Bell className="h-5 w-5 md:mr-2"/>
                        <span className="hidden md:inline">Feedback</span>
                        {newFeedback && newFeedback.length > 0 && (
                            <span className="absolute -top-1 right-0 md:right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                                {newFeedback.length}
                            </span>
                        )}
                    </Button>
                    <Button variant="ghost" onClick={() => signOut(auth)} className="px-2 md:px-4">
                        <LogOut className="h-5 w-5 md:mr-2"/>
                        <span className="hidden md:inline">Logout</span>
                    </Button>
                </div>
            </header>
            <main className="p-4 md:p-6 space-y-8">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {isLoading && Array.from({length: 4}).map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                            <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                        </Card>
                    ))}

                    {!isLoading && organizations?.map(org => (
                        <Card key={org.id} className="h-full bg-card/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="h-5 w-5 text-primary" />
                                    {org.name.charAt(0).toUpperCase() + org.name.slice(1)}
                                </CardTitle>
                                <CardDescription className="font-mono text-xs pt-1">{org.id}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>{orgStats[org.id]?.userCount ?? 0} Members</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {!isLoading && organizations?.length === 0 && (
                        <p className="text-muted-foreground col-span-full text-center py-16">No organizations found.</p>
                    )}
                </div>

                <DataManagement />
                <ErrorLogViewer />
            </main>
            <FeedbackViewer open={showFeedback} onOpenChange={setShowFeedback} />
        </div>
    );
}
