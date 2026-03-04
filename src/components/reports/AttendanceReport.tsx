'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Attendance, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '../ui/skeleton';

interface AttendanceReportProps {
    userProfile: UserProfile;
}

export function AttendanceReport({ userProfile }: AttendanceReportProps) {
    const firestore = useFirestore();

    const attendanceQuery = useMemoFirebase(() => {
        return query(
            collection(firestore, 'attendance'),
            where('orgId', '==', userProfile.orgId),
            where('status', '==', 'APPROVED')
        )
    }, [firestore, userProfile.orgId]);

    const { data: attendanceRecords, isLoading } = useCollection<Attendance>(attendanceQuery);

    const userAttendanceData = useMemo(() => {
        if (!attendanceRecords) return [];

        const userTotals = attendanceRecords.reduce((acc, record) => {
            if (!acc[record.userName]) {
                acc[record.userName] = {
                    totalHours: 0,
                    overtimeHours: 0,
                    undertimeHours: 0,
                };
            }
            acc[record.userName].totalHours += (record.duration || 0);
            acc[record.userName].overtimeHours += (record.overtime || 0);
            acc[record.userName].undertimeHours += (record.undertime || 0);
            return acc;
        }, {} as Record<string, { totalHours: number; overtimeHours: number; undertimeHours: number }>);

        return Object.entries(userTotals).map(([userName, totals]) => ({
            name: userName.split(' ')[0], // Use first name for brevity
            "Total Hours": parseFloat((totals.totalHours / 3600).toFixed(2)),
            "Overtime": parseFloat((totals.overtimeHours / 3600).toFixed(2)),
            "Undertime": parseFloat((totals.undertimeHours / 3600).toFixed(2)),
        }));
    }, [attendanceRecords]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-72 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Team Attendance Summary</CardTitle>
                <CardDescription>Total hours, overtime, and undertime logged by each team member.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={userAttendanceData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                            <YAxis 
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                unit="h"
                            />
                            <Tooltip 
                                cursor={{fill: 'hsl(var(--secondary))'}}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                }}
                                formatter={(value: number, name: string) => [`${value.toFixed(2)} hours`, name]}
                            />
                            <Legend />
                            <Bar dataKey="Total Hours" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Overtime" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Undertime" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
