'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DataManagement() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);

    const downloadJson = (filename: string, data: any) => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExport = async (collectionName: string) => {
        if (!firestore) return;
        setLoading(collectionName);
        try {
            const querySnapshot = await getDocs(collection(firestore, collectionName));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            downloadJson(`${collectionName}_export_${new Date().toISOString().split('T')[0]}`, data);
            toast({ title: 'Export Successful', description: `Exported ${data.length} documents from ${collectionName}.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
        } finally {
            setLoading(null);
        }
    };
    
    const handleExportAll = async () => {
        if (!firestore) return;
        setLoading('all');
        try {
            const collectionsToExport = [
                'organizations', 'users', 'system_configs', 'departments',
                'requisitions', 'tasks', 'attendance', 'announcements', 
                'workbooks', 'feedback', 'chats'
            ];

            const allData: Record<string, any[]> = {};
            
            for (const name of collectionsToExport) {
                 const querySnapshot = await getDocs(collection(firestore, name));
                 allData[name] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            
            // Handle subcollections
            const sheetsSnapshot = await getDocs(collectionGroup(firestore, 'sheets'));
            allData['sheets'] = sheetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const messagesSnapshot = await getDocs(collectionGroup(firestore, 'messages'));
            allData['chat_messages'] = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));


            downloadJson(`palilious_full_backup_${new Date().toISOString().split('T')[0]}`, allData);
            toast({ title: 'Full Export Successful', description: `All data has been exported.` });

        } catch (e: any) {
             toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
        } finally {
            setLoading(null);
        }
    }

    const exportOptions = [
        { name: 'Organizations', id: 'organizations' },
        { name: 'Users', id: 'users' },
        { name: 'System Configs', id: 'system_configs' },
        { name: 'Departments', id: 'departments' },
        { name: 'Requisitions', id: 'requisitions' },
        { name: 'Tasks', id: 'tasks' },
        { name: 'Attendance', id: 'attendance' },
        { name: 'Workbooks', id: 'workbooks' },
        { name: 'Feedback', id: 'feedback' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Export your Firestore data to JSON files. Selective exports do not include sub-collections (e.g., sheets, chat messages).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {exportOptions.map(option => (
                        <Button 
                            key={option.id}
                            variant="outline"
                            onClick={() => handleExport(option.id)}
                            disabled={!!loading}
                        >
                            {loading === option.id ? <Loader2 className="animate-spin" /> : <Download />}
                            Export {option.name}
                        </Button>
                    ))}
                </div>
                <div className="border-t pt-4">
                     <Button 
                        className="w-full"
                        onClick={() => handleExportAll()}
                        disabled={!!loading}
                    >
                        {loading === 'all' ? <Loader2 className="animate-spin" /> : <Download />}
                        Export All Data (Full Backup)
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
