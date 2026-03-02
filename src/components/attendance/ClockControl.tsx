"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Attendance } from "@/lib/types";
import { format, differenceInSeconds } from 'date-fns';
import { Clock, Loader2 } from "lucide-react";

export function ClockControl() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duration, setDuration] = useState('00:00:00');

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const attendanceCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'attendance');
    }, [firestore]);

    const attendanceTodayQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(attendanceCollectionRef!, where('userId', '==', user.uid), where('date', '==', todayStr));
    }, [firestore, user, todayStr, attendanceCollectionRef]);

    const { data: attendanceRecords, isLoading } = useCollection<Attendance>(attendanceTodayQuery);
    const todaysRecord = attendanceRecords?.[0];

    const isClockedIn = todaysRecord && !todaysRecord.clockOut;

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isClockedIn && todaysRecord?.clockIn) {
            intervalId = setInterval(() => {
                const now = new Date();
                const clockInTime = new Date(todaysRecord.clockIn);
                const seconds = differenceInSeconds(now, clockInTime);

                const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
                const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
                const s = String(seconds % 60).padStart(2, '0');
                setDuration(`${h}:${m}:${s}`);
            }, 1000);
        }
        return () => clearInterval(intervalId);
    }, [isClockedIn, todaysRecord]);


    const handleClockIn = () => {
        if (!user || !firestore || !attendanceCollectionRef) return;
        setIsSubmitting(true);
        const newRecord = {
            userId: user.uid,
            date: todayStr,
            clockIn: new Date().toISOString(),
        };
        addDocumentNonBlocking(attendanceCollectionRef, newRecord);
        // Optimistic update handled by real-time listener
        setTimeout(() => setIsSubmitting(false), 1000); 
    };

    const handleClockOut = () => {
        if (!todaysRecord || !firestore) return;
        setIsSubmitting(true);
        const recordRef = doc(firestore, 'attendance', todaysRecord.id);
        updateDocumentNonBlocking(recordRef, { clockOut: new Date().toISOString() });
        // Optimistic update handled by real-time listener
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    const buttonDisabled = isLoading || isSubmitting;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Time Clock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                {isClockedIn && (
                    <div className="text-4xl font-bold font-mono bg-muted text-muted-foreground rounded-lg p-4">
                        {duration}
                    </div>
                )}
                <Button
                    size="lg"
                    className="w-full h-12 text-lg"
                    onClick={isClockedIn ? handleClockOut : handleClockIn}
                    disabled={buttonDisabled}
                >
                    {buttonDisabled ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <><Clock className="mr-2" /> {isClockedIn ? 'Clock Out' : 'Clock In'}</>
                    )}
                </Button>
                 <p className="text-xs text-muted-foreground">{format(today, 'PPPP')}</p>
            </CardContent>
        </Card>
    );
}
