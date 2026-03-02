'use client';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, Query, DocumentData } from "firebase/firestore";
import type { Requisition, UserProfile } from "@/lib/types";
import { RequisitionStatusBadge } from './RequisitionStatusBadge';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { RequisitionDetailDialog } from './RequisitionDetailDialog';
import { FileText } from 'lucide-react';

interface RequisitionTableProps {
    filter: string;
    userProfile: UserProfile | null;
    isSuperAdmin: boolean;
}

const getQueryForFilter = (reqsRef: any, baseClauses: any[], filter: string, role: UserProfile['role'] | 'SUPER_ADMIN' | 'STAFF', userId: string) => {
    const roleClauses: Record<string, any[]> = {
        STAFF: {
            "My Requests": [where('createdBy', '==', userId)],
            "Pending": [where('createdBy', '==', userId), where('status', 'in', ['PENDING_HR', 'PENDING_FINANCE', 'PENDING_MD'])],
            "Approved": [where('createdBy', '==', userId), where('status', '==', 'APPROVED')],
            "Rejected": [where('createdBy', '==', userId), where('status', '==', 'REJECTED')],
        },
        HR: {
            "Inbox": [where('status', '==', 'PENDING_HR')],
            "Approved": [where('status', '==', 'APPROVED')],
            "Rejected": [where('status', '==', 'REJECTED')],
            "All": [],
        },
        FINANCE: {
            "Inbox": [where('status', 'in', ['PENDING_FINANCE', 'APPROVED'])],
            "Approved": [where('status', '==', 'APPROVED')],
            "Paid": [where('status', '==', 'PAID')],
            "Rejected": [where('status', '==', 'REJECTED')],
            "All": [],
        },
        MD: {
            "Inbox": [where('status', '==', 'PENDING_MD')],
            "Approved": [where('status', '==', 'APPROVED')],
            "Rejected": [where('status', '==', 'REJECTED')],
            "All": [],
        },
        ORG_ADMIN: {
            "All": [],
            "Pending": [where('status', 'in', ['PENDING_HR', 'PENDING_FINANCE', 'PENDING_MD'])],
            "Approved": [where('status', '==', 'APPROVED')],
            "Paid": [where('status', '==', 'PAID')],
            "Rejected": [where('status', '==', 'REJECTED')],
        },
        SUPER_ADMIN: { // Super admin sees across all orgs
             "All": [],
            "Pending": [where('status', 'in', ['PENDING_HR', 'PENDING_FINANCE', 'PENDING_MD'])],
            "Approved": [where('status', '==', 'APPROVED')],
            "Paid": [where('status', '==', 'PAID')],
            "Rejected": [where('status', '==', 'REJECTED')],
        }
    };
    
    const filterClauses = (roleClauses[role] || roleClauses['STAFF'])[filter] || [];
    return query(reqsRef, ...baseClauses, ...filterClauses, orderBy('createdAt', 'desc'));
};

export function RequisitionTable({ filter, userProfile, isSuperAdmin }: RequisitionTableProps) {
    const firestore = useFirestore();
    const [selectedRequest, setSelectedRequest] = useState<Requisition | null>(null);

    const requisitionsQuery = useMemoFirebase((): Query<DocumentData> | null => {
        if (!firestore || !userProfile) return null;
        
        const reqsRef = collection(firestore, 'requisitions');
        const role = isSuperAdmin ? 'SUPER_ADMIN' : userProfile.role;
        const baseClauses = isSuperAdmin ? [] : [where('orgId', '==', userProfile.orgId)];
        
        return getQueryForFilter(reqsRef, baseClauses, filter, role, userProfile.id);
    }, [firestore, filter, userProfile, isSuperAdmin]);

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
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FileText className="h-8 w-8"/>
                                        <p className="font-medium">No requisitions found.</p>
                                        <p className="text-sm">This inbox is clear. Great job!</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && requisitions?.map(req => (
                            <TableRow key={req.id} onClick={() => setSelectedRequest(req)} className="cursor-pointer">
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
                />
            )}
        </>
    );
}
