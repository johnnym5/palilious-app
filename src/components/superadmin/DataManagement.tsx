'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, Upload, CloudCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/alert-dialog';


export function DataManagement() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<Record<string, number> | null>(null);
    const [isParsing, setIsParsing] = useState(false);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileToImport(file || null);
        setImportPreview(null);
        if (file) {
            setIsParsing(true);
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target?.result;
                    if (typeof content !== 'string') throw new Error("File read error");
                    const data = JSON.parse(content);
                    const preview: Record<string, number> = {};
                    for (const key in data) {
                        if (Array.isArray(data[key])) {
                            preview[key] = data[key].length;
                        }
                    }
                    setImportPreview(preview);
                } catch (err: any) {
                    toast({ variant: 'destructive', title: 'Parse Error', description: `Could not parse JSON file: ${err.message}` });
                    setFileToImport(null);
                } finally {
                    setIsParsing(false);
                }
            };
            reader.readAsText(file);
        }
    };

    const handleImport = () => {
        // This will be implemented in the next step. For now, it's a placeholder.
        toast({
            title: "Ready for Next Step",
            description: "Data import functionality will be fully implemented in the next phase.",
        });
    };

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
                <CardDescription>Backup, restore, and export your application data.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="export" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="export">Export to JSON</TabsTrigger>
                        <TabsTrigger value="backup">Cloud Backup</TabsTrigger>
                        <TabsTrigger value="import">Import from JSON</TabsTrigger>
                    </TabsList>
                    <TabsContent value="export" className="mt-4">
                        <p className="text-sm text-muted-foreground mb-4">Download collections as JSON files. This is useful for local analysis but is not a complete, restorable backup.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {exportOptions.map(option => (
                                <Button 
                                    key={option.id}
                                    variant="outline"
                                    onClick={() => handleExport(option.id)}
                                    disabled={!!loading}
                                >
                                    {loading === option.id ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                                    {option.name}
                                </Button>
                            ))}
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <Button 
                                className="w-full"
                                onClick={() => handleExportAll()}
                                disabled={!!loading}
                            >
                                {loading === 'all' ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                                Export All Data (Full Snapshot)
                            </Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="backup" className="mt-4">
                         <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
                            <CloudCog className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Cloud Backup & Restore</h3>
                            <p className="mt-1 text-sm text-muted-foreground">This feature will allow you to create and restore from automated Google Cloud backups. The full implementation is coming soon.</p>
                            <p className="text-xs text-muted-foreground mt-4">Note: The application uses Firestore, not Realtime Database. Backups will be managed for the Firestore instance.</p>
                         </div>
                    </TabsContent>
                     <TabsContent value="import" className="mt-4">
                         <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Select a JSON backup file to preview its contents. The final import step is destructive and will overwrite existing data.
                            </p>
                            <div className="space-y-4">
                                <Input type="file" accept=".json" onChange={handleFileSelect} disabled={isParsing || !!loading}/>
                                {isParsing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" /> Parsing file...</div>}
                                {importPreview && (
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">Import Preview</CardTitle></CardHeader>
                                        <CardContent>
                                            <p className="text-sm font-medium mb-2">The following data will be imported:</p>
                                            <ul className="text-sm text-muted-foreground list-disc pl-5 max-h-48 overflow-y-auto">
                                                {Object.entries(importPreview).map(([key, value]) => (
                                                    <li key={key}><strong>{value}</strong> document(s) in <strong>{key}</strong></li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                            <div className="border-t pt-4">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full" disabled={!importPreview || !!loading || isParsing}>
                                            {loading === 'import' ? <Loader2 className="mr-2 animate-spin" /> : <Upload className="mr-2" />}
                                            Import Data
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This is a destructive action that cannot be undone. It will overwrite any existing documents with the same ID. Are you sure you want to proceed?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleImport} className="bg-destructive hover:bg-destructive/90">Yes, Start Import</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
