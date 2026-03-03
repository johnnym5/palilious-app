'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Department, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AddDepartmentDialog } from './AddDepartmentDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface DepartmentManagerProps {
    userProfile: UserProfile;
}

export function DepartmentManager({ userProfile }: DepartmentManagerProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

    const departmentsQuery = useMemoFirebase(() => 
        query(collection(firestore, 'departments'), where('orgId', '==', userProfile.orgId))
    , [firestore, userProfile.orgId]);

    const { data: departments, isLoading } = useCollection<Department>(departmentsQuery);

    const handleDelete = () => {
        if (!deptToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'departments', deptToDelete.id));
        toast({ title: 'Department Deleted', description: `The "${deptToDelete.name}" department has been removed.` });
        setDeptToDelete(null);
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Departments</CardTitle>
                        <CardDescription>Manage the departments in your organization.</CardDescription>
                    </div>
                    <AddDepartmentDialog open={isAddOpen} onOpenChange={setIsAddOpen} userProfile={userProfile}>
                        <Button onClick={() => setIsAddOpen(true)}>
                            <PlusCircle className="mr-2" />
                            Add Department
                        </Button>
                    </AddDepartmentDialog>
                </CardHeader>
                <CardContent>
                    {isLoading && <Skeleton className="h-10 w-full" />}
                    {!isLoading && (!departments || departments.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">No departments created yet.</p>
                    )}
                    {!isLoading && departments && departments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {departments.map(dept => (
                                <Badge key={dept.id} variant="secondary" className="text-base py-1 pl-3 pr-1 group">
                                    {dept.name}
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 ml-1 text-muted-foreground group-hover:text-destructive"
                                        onClick={() => setDeptToDelete(dept)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {deptToDelete && (
                <AlertDialog open={!!deptToDelete} onOpenChange={isOpen => !isOpen && setDeptToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{deptToDelete.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove the department. It will not remove users from the system, but they will no longer be assigned to this department.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
