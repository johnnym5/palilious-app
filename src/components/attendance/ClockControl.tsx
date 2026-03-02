"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { format, differenceInSeconds } from 'date-fns';
import { Clock, Loader2, LogIn, LogOut } from "lucide-react";
import type { UserProfile, Attendance } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { useFirestore, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, where, limit, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface ClockControlProps {
  userProfile: UserProfile | null;
  permissions: Permissions;
}

export function ClockControl({ userProfile, permissions }: ClockControlProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attendanceRecord, setAttendanceRecord] = useState<Attendance | null>(null);
    const [shiftDuration, setShiftDuration] = useState("00:00:00");
    
    const today = format(new Date(), 'yyyy-MM-dd');

    // This is not memoized with useMemoFirebase because we want it to fetch once on load, not subscribe
    const attendanceQuery = userProfile ? query(
        collection(firestore, 'attendance'),
        where('userId', '==', userProfile.id),
        where('date', '==', today),
        limit(1)
    ) : null;
    const { data: attendanceData, isLoading: isAttendanceLoading } = useCollection<Attendance>(attendanceQuery);
    
    useEffect(() => {
        if (!isAttendanceLoading) {
            const record = attendanceData?.[0] || null;
            setAttendanceRecord(record);
            setIsLoading(false);
        }
    }, [attendanceData, isAttendanceLoading]);

    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;
        if (userProfile?.status === 'ONLINE' && attendanceRecord?.clockIn) {
            timer = setInterval(() => {
                const now = new Date();
                const clockInTime = new Date(attendanceRecord.clockIn);
                const seconds = differenceInSeconds(now, clockInTime);
                const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
                const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
                const s = String(seconds % 60).padStart(2, '0');
                setShiftDuration(`${h}:${m}:${s}`);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [userProfile?.status, attendanceRecord?.clockIn]);

    const handleClockIn = async () => {
        if (!userProfile) return;
        setIsSubmitting(true);
        
        try {
            const userRef = doc(firestore, 'users', userProfile.id);
            updateDocumentNonBlocking(userRef, { status: 'ONLINE' });

            const attendanceRef = collection(firestore, 'attendance');
            const newRecord: Omit<Attendance, 'id'> = {
                userId: userProfile.id,
                orgId: userProfile.orgId,
                date: today,
                clockIn: new Date().toISOString(),
            };
            await addDocumentNonBlocking(attendanceRef, newRecord);

            toast({ title: "Clocked In", description: "Your shift has started." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClockOut = async () => {
        if (!userProfile || !attendanceRecord) return;
        setIsSubmitting(true);

        try {
            const userRef = doc(firestore, 'users', userProfile.id);
            updateDocumentNonBlocking(userRef, { status: 'OFFLINE' });
            
            const attendanceRef = doc(firestore, 'attendance', attendanceRecord.id);
            updateDocumentNonBlocking(attendanceRef, { clockOut: new Date().toISOString() });
            
            toast({ title: "Clocked Out", description: "Your shift has ended." });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
             setIsSubmitting(false);
        }
    };
    
    const isClockedIn = userProfile?.status === 'ONLINE';

    if (isLoading) {
        return <Card><CardContent className="p-6"><Loader2 className="mx-auto animate-spin" /></CardContent></Card>
    }

    if (!permissions.canClockIn) {
         return (
            <Card>
                <CardHeader><CardTitle>Time Clock</CardTitle></CardHeader>
                <CardContent><p className="text-center text-sm text-muted-foreground">Time clock is disabled for your position.</p></CardContent>
            </Card>
         );
    }

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle>Time Clock</CardTitle>
                <CardDescription>{format(new Date(), 'PPPP')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                {isClockedIn ? (
                    <>
                        <Button
                            size="lg"
                            variant="destructive"
                            className="w-full h-20 text-lg flex-col gap-1"
                            disabled={isSubmitting}
                            onClick={handleClockOut}
                        >
                            <div className="flex items-center gap-2">
                               {isSubmitting ? <Loader2 className="animate-spin"/> : <LogOut />}
                                Clock Out
                            </div>
                             <p className="font-mono text-xl tracking-widest">{shiftDuration}</p>
                        </Button>
                        <p className="text-xs text-muted-foreground">You are currently on the clock.</p>
                    </>
                ) : (
                    <Button
                        size="lg"
                        className="w-full h-20 text-lg bg-emerald-600 hover:bg-emerald-700"
                        disabled={isSubmitting}
                        onClick={handleClockIn}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin"/> : <LogIn />}
                        Clock In
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
