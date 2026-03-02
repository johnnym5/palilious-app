'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Requisition,
  UserProfile,
  ApprovalHistoryEntry,
  RequisitionStatus,
} from '@/lib/types'
import { RequisitionStatusBadge } from './RequisitionStatusBadge'
import { format, formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { ScrollArea } from '../ui/scroll-area'
import {
  Banknote,
  Calendar,
  Check,
  FileText,
  History,
  Info,
  User,
  X,
} from 'lucide-react'
import { Button } from '../ui/button'
import {
  doc,
  arrayUnion,
} from 'firebase/firestore'
import { useFirestore, updateDocumentNonBlocking } from '@/firebase'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '../ui/textarea'
import { useState } from 'react'

interface RequisitionDetailDialogProps {
  requisition: Requisition
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  currentUserProfile: UserProfile
  isSuperAdmin: boolean
}

type ActionRole = 'HR' | 'FINANCE' | 'MD'

const WORKFLOW: Record<
  RequisitionStatus,
  { next: RequisitionStatus; role: ActionRole }
> = {
  PENDING_HR: { next: 'PENDING_FINANCE', role: 'HR' },
  PENDING_FINANCE: { next: 'PENDING_MD', role: 'FINANCE' },
  PENDING_MD: { next: 'APPROVED', role: 'MD' },
  APPROVED: { next: 'PAID', role: 'FINANCE' },
  PAID: { next: 'PAID', role: 'FINANCE' }, // Terminal
  REJECTED: { next: 'REJECTED', role: 'HR' }, // Terminal
}

export function RequisitionDetailDialog({
  requisition,
  isOpen,
  onOpenChange,
  currentUserProfile,
  isSuperAdmin,
}: RequisitionDetailDialogProps) {
  const firestore = useFirestore()
  const { toast } = useToast()
  const [rejectionReason, setRejectionReason] = useState('')

  const canTakeAction = () => {
    if (!currentUserProfile) return false
    if (requisition.status === 'PAID' || requisition.status === 'REJECTED')
      return false
    if (isSuperAdmin) return true

    const requiredRole = WORKFLOW[requisition.status]?.role
    return currentUserProfile.role === requiredRole
  }

  const handleAction = async (
    action: 'APPROVE' | 'REJECT' | 'MARK_AS_PAID'
  ) => {
    if (!firestore || !currentUserProfile) return

    let nextStatus: RequisitionStatus
    let successMessage = ''
    let actionVerb: ApprovalHistoryEntry['action']

    if (action === 'REJECT') {
      if (!rejectionReason) {
        toast({
          variant: 'destructive',
          title: 'Reason Required',
          description: 'Please provide a reason for rejection.',
        })
        return
      }
      nextStatus = 'REJECTED'
      successMessage = `Requisition ${requisition.serialNo} has been rejected.`
      actionVerb = 'REJECTED'
    } else if (action === 'MARK_AS_PAID') {
      nextStatus = 'PAID'
      successMessage = `Requisition ${requisition.serialNo} marked as Paid.`
      actionVerb = 'PAID'
    } else {
      nextStatus = WORKFLOW[requisition.status].next
      successMessage = `Requisition ${requisition.serialNo} approved and moved to ${nextStatus}.`
      actionVerb = 'APPROVED'
    }

    const historyEntry: ApprovalHistoryEntry = {
      actorId: currentUserProfile.id,
      actorName: currentUserProfile.fullName,
      action: actionVerb,
      timestamp: new Date().toISOString(),
      fromStatus: requisition.status,
      toStatus: nextStatus,
      reason: action === 'REJECT-REASON' ? rejectionReason : undefined,
    }

    const requisitionRef = doc(firestore, 'requisitions', requisition.id)
    updateDocumentNonBlocking(requisitionRef, {
      status: nextStatus,
      approvalHistory: arrayUnion(historyEntry),
    })

    toast({ title: 'Success', description: successMessage })
    onOpenChange(false)
  }

  const approvalActionText =
    requisition.status === 'APPROVED' ? 'Mark as Paid' : 'Approve'

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {requisition.serialNo}: {requisition.title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-1">
            <RequisitionStatusBadge status={requisition.status} />
            <span>
              Created by {requisition.creatorName} on{' '}
              {format(new Date(requisition.createdAt), 'PPP')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 py-4">
          <div className="col-span-2 space-y-6">
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Info className="h-4 w-4" /> Details
              </h4>
              <p className="text-foreground">{requisition.description}</p>
            </div>

            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <History className="h-4 w-4" /> Approval History
              </h4>
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="space-y-3">
                  {requisition.approvalHistory
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 border">
                          <AvatarImage />
                          <AvatarFallback>
                            {entry.actorName
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {entry.actorName}{' '}
                            <span className="text-muted-foreground">
                              {entry.action.toLowerCase()} the request.
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.timestamp), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <div className="col-span-1 space-y-4 rounded-lg border bg-secondary/30 p-4">
            <div className="flex items-start justify-between">
              <h4 className="font-semibold">Summary</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Banknote className="h-4 w-4" /> Amount
                </span>
                <span className="font-mono text-lg font-semibold text-primary">
                  ${requisition.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> Creator
                </span>
                <span className="font-medium">{requisition.creatorName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Created
                </span>
                <span className="font-medium">
                  {format(new Date(requisition.createdAt), 'PP')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {canTakeAction() && (
          <DialogFooter className="gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Provide a reason for rejecting this requisition. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Type your reason here..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleAction('REJECT')}
                    disabled={!rejectionReason}
                  >
                    Confirm Rejection
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="default"
              onClick={() =>
                handleAction(
                  requisition.status === 'APPROVED'
                    ? 'MARK_AS_PAID'
                    : 'APPROVE'
                )
              }
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              <Check className="mr-2 h-4 w-4" /> {approvalActionText}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
