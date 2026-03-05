'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import type { UserProfile } from "@/lib/types";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import Link from 'next/link';

interface PerformanceCardProps {
    userProfile: UserProfile;
}

export function PerformanceCard({ userProfile }: PerformanceCardProps) {
    const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
    const [workdayProgress, setWorkdayProgress] = useState<number>(85); // Default to 85% as per design

    useEffect(() => {
        // This is a placeholder effect. In a real app, you'd fetch real performance data.
        // For now, we'll just keep the static value.
        // If you want dynamic progress based on workday, you can uncomment the logic below.
    }, [systemConfig, userProfile, isConfigLoading]);


    return (
        <Card className="bg-primary/90 text-primary-foreground">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold tracking-wider uppercase">Performance Overview</CardTitle>
                    <TrendingUp className="h-5 w-5 text-primary-foreground/70" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-5xl font-bold font-headline">{workdayProgress}%</p>
                        <p className="text-primary-foreground/80">Monthly Target Progress</p>
                    </div>
                     <Link href="/reports">
                        <Button variant="secondary" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">View Details</Button>
                    </Link>
                </div>
                 <Progress value={workdayProgress} className="mt-4 h-2 bg-primary-foreground/20" indicatorClassName="bg-primary-foreground" />
            </CardContent>
        </Card>
    );
}
