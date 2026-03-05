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
    const [workdayProgress, setWorkdayProgress] = useState<number>(0);

    useEffect(() => {
        if (isConfigLoading || !systemConfig?.work_hours?.start || !systemConfig.work_hours.end) {
            return;
        }

        const calculateProgress = () => {
            if (userProfile.status !== 'ONLINE') {
                setWorkdayProgress(0);
                return;
            }

            const now = new Date();
            const [startHour, startMinute] = systemConfig.work_hours.start.split(':').map(Number);
            const [endHour, endMinute] = systemConfig.work_hours.end.split(':').map(Number);

            const startTime = new Date();
            startTime.setHours(startHour, startMinute, 0, 0);

            const endTime = new Date();
            endTime.setHours(endHour, endMinute, 0, 0);
            
            if (now < startTime) {
                setWorkdayProgress(0);
                return;
            }
            if (now > endTime) {
                setWorkdayProgress(100);
                return;
            }

            const totalWorkdaySeconds = (endTime.getTime() - startTime.getTime()) / 1000;
            const elapsedSeconds = (now.getTime() - startTime.getTime()) / 1000;
            
            if (totalWorkdaySeconds <= 0) {
                setWorkdayProgress(100);
                return;
            }
            
            const progress = Math.max(0, Math.min((elapsedSeconds / totalWorkdaySeconds) * 100, 100));
            setWorkdayProgress(progress);
        };

        calculateProgress();
        const interval = setInterval(calculateProgress, 60000); 

        return () => clearInterval(interval);

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
                        <p className="text-5xl font-bold font-headline">{Math.round(workdayProgress)}%</p>
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
