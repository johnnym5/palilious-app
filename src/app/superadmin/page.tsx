'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2, Building, Users, ArrowRight, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import type { Organization, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Logo } from '@/components/Logo';

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

    const orgsQuery = useMemoFirebase(() => collection(firestore, 'organizations'), [firestore]);
    const { data: organizations, isLoading: areOrgsLoading } = useCollection<Organization>(orgsQuery);
    
    useEffect(() => {
        if (!isUserLoading && user && !isSuperAdmin) {
            router.replace('/dashboard');
        }
         if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [user, isUserLoading, isSuperAdmin, router]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!organizations || organizations.length === 0) {
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
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-lg">
                <Logo />
                <div className="flex-1">
                    <h1 className="text-lg font-semibold font-headline">Super Admin Console</h1>
                </div>
                <Button variant="ghost" onClick={() => signOut(auth)}>
                    <LogOut className="mr-2"/>
                    Logout
                </Button>
            </header>
            <main className="p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {isLoading && Array.from({length: 4}).map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                            <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                        </Card>
                    ))}

                    {!isLoading && organizations?.map(org => (
                        <Link key={org.id} href={`/team?orgId=${org.id}`} className="block transition-all hover:-translate-y-1 hover:shadow-primary/20">
                            <Card className="h-full bg-card/50 hover:bg-card">
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
                                        <div className="flex items-center gap-1 text-primary font-semibold text-sm">
                                            Manage <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                    {!isLoading && organizations?.length === 0 && (
                        <p className="text-muted-foreground col-span-full text-center py-16">No organizations found.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
