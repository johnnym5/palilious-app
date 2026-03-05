'use client';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, Query, DocumentData } from "firebase/firestore";
import type { Requisition, UserProfile } from "@/lib/types";
import type { Permissions } from "@/hooks/usePermissions";
import { Skeleton } from '../ui/skeleton';
import { Inbox } from 'lucide-react';
import { RequisitionCard } from './RequisitionCard';

interface RequisitionTableProps {
    filter: string;
    userProfile: UserProfile | null;
    isSuperAdmin: boolean;
    permissions: Permissions;
    onSelectRequest: (req: Requisition) => void;
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
              filterClauses = [where('status', '==', 'NO_RESULTS')]; 
            }
            break;
        case "All":
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
             filterClauses = [where('createdBy', '==', userId)];
            break;
    }
    
    return query(reqsRef, ...baseClauses, ...filterClauses, orderBy('createdAt', 'desc'));
};

export function RequisitionTable({ filter, userProfile, isSuperAdmin, permissions, onSelectRequest }: RequisitionTableProps) {
    const firestore = useFirestore();

    const requisitionsQuery = useMemoFirebase((): Query<DocumentData> | null => {
        if (!firestore || !userProfile) return null;
        
        const reqsRef = collection(firestore, 'requisitions');
        const baseClauses = isSuperAdmin ? [] : [where('orgId', '==', userProfile.orgId)];
        
        return getQueryForFilter(reqsRef, baseClauses, filter, permissions, userProfile.id);
    }, [firestore, filter, userProfile, isSuperAdmin, permissions]);

    const { data: requisitions, isLoading } = useCollection<Requisition>(requisitionsQuery);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full bg-secondary/50" />
                ))}
            </div>
        )
    }

    if (!requisitions || requisitions.length === 0) {
        return (
            <div className="h-48 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                <div className='rounded-full border-8 border-secondary p-4'>
                    <Inbox className="h-12 w-12 text-secondary-foreground"/>
                </div>
                <div className='space-y-1'>
                    <p className="font-semibold text-lg text-foreground">Inbox Clear</p>
                    <p className="text-sm">No requisitions found in this view.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requisitions.map(req => (
                <RequisitionCard key={req.id} requisition={req} onSelect={onSelectRequest} />
            ))}
        </div>
    );
}
