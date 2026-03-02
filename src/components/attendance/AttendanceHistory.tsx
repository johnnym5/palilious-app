'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import type { Attendance, UserProfile } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { format, differenceInSeconds } from 'date-fns';

interface AttendanceHistoryProps {
  userProfile: UserProfile | null;
}

export function AttendanceHistory({ userProfile }: AttendanceHistoryProps) {
  const firestore = useFirestore();

  const attendanceQuery = useMemoFirebase(() => {
    if (!userProfile) return null;
    return query(
      collection(firestore, 'attendance'),
      where('userId', '==', userProfile.id),
      orderBy('date', 'desc'),
      limit(15) // Get the last 15 records
    );
  }, [firestore, userProfile]);

  const { data: attendanceHistory, isLoading } = useCollection<Attendance>(attendanceQuery);

  const calculateDuration = (clockIn: string, clockOut?: string): string => {
    if (!clockOut) {
      return "In Progress";
    }
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diffSeconds = differenceInSeconds(end, start);
    
    if (diffSeconds < 0) return "Invalid";

    const h = Math.floor(diffSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((diffSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (diffSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Attendance History</CardTitle>
        <CardDescription>A log of your recent clock-ins and clock-outs.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead className="text-right">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && attendanceHistory?.length === 0 && (
              <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                      No attendance history found.
                  </TableCell>
              </TableRow>
            )}
            {!isLoading && attendanceHistory?.map(record => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{format(new Date(record.clockIn), 'PPP')}</TableCell>
                <TableCell>{format(new Date(record.clockIn), 'p')}</TableCell>
                <TableCell>{record.clockOut ? format(new Date(record.clockOut), 'p') : '—'}</TableCell>
                <TableCell className="text-right font-mono">{calculateDuration(record.clockIn, record.clockOut)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
