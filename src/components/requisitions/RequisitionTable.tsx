'use client';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, Query, DocumentData } from "firebase/firestore";
import type { Requisition, UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { RequisitionStatusBadge } from './RequisitionStatusBadge';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { RequisitionDetailDialog } from './RequisitionDetailDialog';
import { Inbox } from 'lucide-react';

interface RequisitionTableProps {
    filter: string;
    userProfile: UserProfile | null;
    isSuperAdmin: boolean;
    permissions: Permissions;
}

const getQueryForFilter = (
    reqsRef: Query, 
    baseClauses: any[], 
    filter: string, 
    permissions: Permissions,
    userId: string
): Query => {
    let filterClauses: any[] = [];
    const pendingStatuses = ['PENDING_HR', 'PENDING_FINANCE', 'PENDING_MD'];

    switch (filter) {
        case "My Requests":
            filterClauses = [where('createdBy', '==', userId)];
            break;
        case "Inbox":
            const inboxStatuses: string[] = [];
            if (permissions.canApproveHR) inboxStatuses.push('PENDING_HR');
            if (permissions.canApproveFinance) inboxStatuses.push('PENDING_FINANCE', 'APPROVED');
            if (permissions.canApproveMD) inboxStatuses.push('PENDING_MD');
            if (inboxStatuses.length > 0) {
              filterClauses = [where('status', 'in', [...new Set(inboxStatuses)])];
            } else {
              // If user has an "Inbox" tab but no permissions, show nothing.
              filterClauses = [where('status', '==', 'NO_RESULTS')]; 
            }
            break;
        case "All":
             // No extra filters needed for 'All' if permissions are high enough
            break;
        case "Pending":
            filterClauses = [where('status', 'in', pendingStatuses)];
            break;
        case "Approved":
            filterClauses = [where('status', '==', 'APPROVED')];
            break;
        case "Paid":
            filterClauses = [where('status', '==', 'PAID')];
            break;
        case "Rejected":
            filterClauses = [where('status', '==', 'REJECTED')];
            break;
        default:
            // Default to my requests if filter is unknown
             filterClauses = [where('createdBy', '==', userId)];
            break;
    }
    
    return query(reqsRef, ...baseClauses, ...filterClauses, orderBy('createdAt', 'desc'));
};

export function RequisitionTable({ filter, userProfile, isSuperAdmin, permissions }: RequisitionTableProps) {
    const firestore = useFirestore();
    const [selectedRequest, setSelectedRequest] = useState<Requisition | null>(null);

    const requisitionsQuery = useMemoFirebase((): Query<DocumentData> | null => {
        if (!firestore || !userProfile) return null;
        
        const reqsRef = collection(firestore, 'requisitions');
        const baseClauses = isSuperAdmin ? [] : [where('orgId', '==', userProfile.orgId)];
        
        return getQueryForFilter(reqsRef, baseClauses, filter, permissions, userProfile.id);
    }, [firestore, filter, userProfile, isSuperAdmin, permissions]);

    const { data: requisitions, isLoading } = useCollection<Requisition>(requisitionsQuery);

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Serial No.</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Created By</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={6}><Skeleton className="h-8 w-full bg-secondary/50" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && requisitions?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-4">
                                        <div className='rounded-full border-8 border-secondary p-4'>
                                          <Inbox className="h-12 w-12 text-secondary-foreground"/>
                                        </div>
                                        <div className='space-y-1'>
                                          <p className="font-semibold text-lg text-foreground">Inbox Clear</p>
                                          <p className="text-sm">No requisitions found in this view.</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && requisitions?.map(req => (
                            <TableRow key={req.id} onClick={() => setSelectedRequest(req)} className="cursor-pointer hover:bg-secondary/50">
                                <TableCell className="font-mono text-xs text-muted-foreground">{req.serialNo}</TableCell>
                                <TableCell className="font-medium">{req.title}</TableCell>
                                <TableCell className="text-muted-foreground">{req.creatorName}</TableCell>
                                <TableCell className="text-right font-semibold text-primary">${req.amount.toFixed(2)}</TableCell>
                                <TableCell className="text-muted-foreground">{format(new Date(req.createdAt), "dd MMM, yyyy")}</TableCell>
                                <TableCell><RequisitionStatusBadge status={req.status} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {selectedRequest && userProfile && (
                <RequisitionDetailDialog
                    requisition={selectedRequest}
                    isOpen={!!selectedRequest}
                    onOpenChange={(isOpen) => !isOpen && setSelectedRequest(null)}
                    currentUserProfile={userProfile}
                    isSuperAdmin={isSuperAdmin}
                    permissions={permissions}
                />
            )}
        </>
    );
}
