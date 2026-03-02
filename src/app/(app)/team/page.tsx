'use client';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSimpleAuth } from '@/hooks/use-simple-auth';

export default function TeamPage() {
  const { user } = useSimpleAuth();
  const canManageUsers = user?.role === 'HR' || user?.role === 'MD';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground">Browse and manage team members.</p>
        </div>
        {canManageUsers && (
            <Button disabled>
              <PlusCircle className="mr-2" />
              Add New Staff (Disabled)
            </Button>
        )}
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Staff</CardTitle>
            <CardDescription>A list of all registered users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Staff directory is temporarily disabled.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
