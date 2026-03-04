'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import type { DailyReport, UserProfile } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { format, formatDistanceToNow } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';


interface TeamDailyReportsProps {
  userProfile: UserProfile;
}

export function TeamDailyReports({ userProfile }: TeamDailyReportsProps) {
  const firestore = useFirestore();
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  const reportsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, 'daily_reports'),
        where('orgId', '==', userProfile.orgId),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
    [firestore, userProfile.orgId]
  );

  const { data: reports, isLoading } = useCollection<DailyReport>(reportsQuery);

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Team Daily Reports</CardTitle>
        <CardDescription>Review recent reports submitted by your team.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Report Snippet</TableHead>
                    <TableHead className="text-right">Submitted</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                 {!isLoading && reports?.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">No reports submitted yet.</TableCell></TableRow>
                 )}
                 {!isLoading && reports?.map(report => (
                    <TableRow key={report.id} onClick={() => setSelectedReport(report)} className="cursor-pointer">
                        <TableCell className="font-medium">{format(new Date(report.reportDate), 'PPP')}</TableCell>
                        <TableCell>{report.userName}</TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-sm">{report.content}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{formatDistanceToNow(new Date(report.createdAt), {addSuffix: true})}</TableCell>
                    </TableRow>
                 ))}
            </TableBody>
        </Table>
      </CardContent>
    </Card>

    {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={(isOpen) => !isOpen && setSelectedReport(null)}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                <DialogTitle>Report from {selectedReport.userName}</DialogTitle>
                <DialogDescription>
                    Submitted on {format(new Date(selectedReport.createdAt), 'PPP, p')}
                </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <h4 className="font-semibold">Summary</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.content}</p>
                    
                    {selectedReport.completedTasks && selectedReport.completedTasks.length > 0 && (
                        <div>
                            <h4 className="font-semibold mt-4 mb-2">Tasks Mentioned:</h4>
                            <ul className="space-y-1 list-disc pl-5">
                                {selectedReport.completedTasks.map(task => (
                                    <li key={task.taskId} className="text-sm flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        {task.title}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )}
    </>
  );
}
