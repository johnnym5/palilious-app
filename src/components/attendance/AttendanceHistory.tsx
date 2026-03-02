'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { Attendance } from "@/lib/types";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { Skeleton } from "../ui/skeleton";

export function AttendanceHistory() {
  const { user } = useUser();
  const firestore = useFirestore();

  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'attendance'), where('userId', '==', user.uid), orderBy('date', 'desc'), limit(10));
  }, [firestore, user]);

  const { data: records, isLoading } = useCollection<Attendance>(historyQuery);

  const calculateDuration = (clockIn: string, clockOut?: string) => {
    if (!clockOut) return 'In Progress';
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    return `${hours}h ${minutes}m`;
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
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
              </TableRow>
            ))}
            {records?.map(record => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{format(new Date(record.date), 'PPP')}</TableCell>
                <TableCell>{format(new Date(record.clockIn), 'p')}</TableCell>
                <TableCell>{record.clockOut ? format(new Date(record.clockOut), 'p') : '-'}</TableCell>
                <TableCell className="text-right">{calculateDuration(record.clockIn, record.clockOut)}</TableCell>
              </TableRow>
            ))}
             {!isLoading && records?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No attendance records found.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
