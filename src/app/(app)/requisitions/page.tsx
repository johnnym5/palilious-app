'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RequisitionsPage() {
  return (
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
      <Card>
        <CardHeader>
            <CardTitle>Requisition Portal</CardTitle>
            <CardDescription>Manage all financial requisitions.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="paid">Paid</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
                    <RequisitionTable status="all" />
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                    <RequisitionTable status="pending" />
                </TabsContent>
                 <TabsContent value="approved" className="mt-4">
                    <RequisitionTable status="approved" />
                </TabsContent>
                 <TabsContent value="paid" className="mt-4">
                    <RequisitionTable status="paid" />
                </TabsContent>
                <TabsContent value="rejected" className="mt-4">
                    <RequisitionTable status="rejected" />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

      <Button className="absolute bottom-0 right-0 h-16 w-16 rounded-full shadow-lg">
        <Plus className="h-8 w-8" />
        <span className="sr-only">New Request</span>
      </Button>
    </div>
  );
}

function RequisitionTable({ status }: { status: string }) {
    // In a real app, you'd filter requisitions based on the status prop.
    return (
         <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden md:table-cell">Created By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No requisitions found. This feature is coming soon.
                    </TableCell>
                </TableRow>
                 {/* Example Row:
                 <TableRow>
                    <TableCell className="font-mono text-xs">REQ-0001</TableCell>
                    <TableCell>Office Supplies</TableCell>
                    <TableCell className="hidden md:table-cell">Admin</TableCell>
                    <TableCell className="text-right">$250.00</TableCell>
                    <TableCell><Badge className="bg-amber-500">PENDING_HR</Badge></TableCell>
                 </TableRow> 
                 */}
            </TableBody>
        </Table>
    )
}
