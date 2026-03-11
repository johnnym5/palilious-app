'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { ErrorLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, User, Code, FileText, Globe } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export function ErrorLogViewer() {
    const firestore = useFirestore();

    const errorsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'error_logs'), orderBy('timestamp', 'desc'), limit(50));
    }, [firestore]);

    const { data: errors, isLoading } = useCollection<ErrorLog>(errorsQuery);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Application Error Logs</CardTitle>
                <CardDescription>A live feed of the last 50 errors captured from the application.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] border rounded-lg p-2">
                     {isLoading && (
                        <div className="space-y-2 p-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    )}
                    {!isLoading && errors?.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-10">
                            No errors logged yet.
                        </p>
                    )}
                    <Accordion type="single" collapsible className="w-full">
                        {errors?.map((error) => (
                            <AccordionItem value={error.id} key={error.id} className="border-b-0">
                                <AccordionTrigger className="p-3 hover:bg-secondary/50 rounded-md">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-3 text-left">
                                            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                                            <div className="truncate">
                                                <p className="font-semibold truncate">{error.errorMessage}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                         <p className="text-xs text-muted-foreground font-mono truncate hidden sm:block pr-4">{error.path}</p>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-muted/30 rounded-md">
                                    <div className="space-y-4 text-xs font-mono">
                                        <div className="flex items-start gap-2">
                                            <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                            <p><strong className="font-sans text-foreground">User:</strong> {error.userName || 'N/A'} ({error.userId || 'N/A'})</p>
                                        </div>
                                         <div className="flex items-start gap-2">
                                            <Globe className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                            <p><strong className="font-sans text-foreground">Path:</strong> {error.path}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-sans text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Stack Trace</h4>
                                            <pre className="whitespace-pre-wrap bg-background p-2 rounded-md max-h-48 overflow-y-auto">{error.stackTrace}</pre>
                                        </div>
                                        {error.componentStack && error.componentStack !== 'No component stack available' && (
                                            <div>
                                                <h4 className="font-sans text-sm font-semibold mb-2 flex items-center gap-2"><Code className="h-4 w-4" /> Component Stack</h4>
                                                <pre className="whitespace-pre-wrap bg-background p-2 rounded-md max-h-48 overflow-y-auto">{error.componentStack}</pre>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
