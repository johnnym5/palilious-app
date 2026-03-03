'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import type { Workbook, Sheet, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/usePermissions';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SheetDataTable({ sheet }: { sheet: Sheet }) {
    if (!sheet.data || sheet.data.length === 0) {
        return <p className="text-muted-foreground text-center py-8">This sheet is empty.</p>;
    }

    return (
        <ScrollArea className="h-[60vh] relative">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                    <TableRow>
                        {sheet.headers.map(header => (
                            <TableHead key={header}>{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sheet.data.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {sheet.headers.map(header => (
                                <TableCell key={`${rowIndex}-${header}`}>{row[header]}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}

export default function WorkbookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { user: authUser } = useUser();

    const workbookId = params.workbookId as string;

    const userProfileRef = useMemoFirebase(() => 
        authUser ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const workbookRef = useMemoFirebase(() => doc(firestore, 'workbooks', workbookId), [firestore, workbookId]);
    const { data: workbook, isLoading: isWorkbookLoading } = useDoc<Workbook>(workbookRef);

    const sheetsQuery = useMemoFirebase(() => 
        query(collection(firestore, `workbooks/${workbookId}/sheets`)), 
    [firestore, workbookId]);
    const { data: sheets, isLoading: areSheetsLoading } = useCollection<Sheet>(sheetsQuery);

    const isLoading = isWorkbookLoading || areSheetsLoading || isProfileLoading;

    if (!isLoading && userProfile && !permissions.canManageStaff) {
      return (
           <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold font-headline">Access Denied</h1>
              <p className="text-muted-foreground mt-2">You do not have the required permissions to view this workbook.</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-6">Return to Dashboard</Button>
            </div>
      )
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Card>
                    <CardHeader><Skeleton className="h-10 w-1/4" /></CardHeader>
                    <CardContent><Skeleton className="h-[60vh] w-full" /></CardContent>
                </Card>
            </div>
        )
    }

    if (!workbook) {
        return <p>Workbook not found.</p>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">{workbook.title}</h1>
                <p className="text-muted-foreground">{workbook.description || 'No description provided.'}</p>
            </div>

            {sheets && sheets.length > 0 ? (
                <Card>
                    <Tabs defaultValue={sheets[0].id}>
                        <CardHeader>
                            <TabsList>
                                {sheets.map(sheet => (
                                    <TabsTrigger key={sheet.id} value={sheet.id}>{sheet.name}</TabsTrigger>
                                ))}
                            </TabsList>
                        </CardHeader>
                        <CardContent>
                            {sheets.map(sheet => (
                                <TabsContent key={sheet.id} value={sheet.id}>
                                    <SheetDataTable sheet={sheet} />
                                </TabsContent>
                            ))}
                        </CardContent>
                    </Tabs>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        This workbook has no sheets yet.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
