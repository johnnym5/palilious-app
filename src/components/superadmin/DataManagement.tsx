'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, collectionGroup, writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, Upload, CloudCog, Trash2, ShieldAlert, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
    const [collectionsToImport, setCollectionsToImport] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [clearDbConfirmation, setClearDbConfirmation] = useState('');
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);

    const handleCreateBackup = () => {
        setIsCreatingBackup(true);
        toast({
            title: "Backup In Progress...",
            description: "Your request to create a cloud backup has been received. This may take several minutes.",
        });

        // Simulate a network request & backend unavailability
        setTimeout(() => {
            setIsCreatingBackup(false);
            toast({
                title: "Backend Not Implemented",
                description: "The backend service for creating cloud backups is not yet available.",
                variant: "destructive",
            });
        }, 3000);
    }

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
        setCollectionsToImport([]);
        if (file) {
            setIsParsing(true);
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target?.result;
                    if (typeof content !== 'string') throw new Error("File read error");
                    const data = JSON.parse(content);
                    const preview: Record<string, number> = {};
                    const collectionsFromFile: string[] = [];
                    for (const key in data) {
                        if (Array.isArray(data[key])) {
                            preview[key] = data[key].length;
                            collectionsFromFile.push(key);
                        }
                    }
                    setImportPreview(preview);
                    setCollectionsToImport(collectionsFromFile); // Pre-select all by default
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

    const handleImport = async () => {
        if (!fileToImport || collectionsToImport.length === 0) {
            toast({ variant: 'destructive', title: 'Nothing to Import', description: 'Please select a file and at least one collection to import.' });
            return;
        }
        setLoading('import');

        try {
            const fileContent = await fileToImport.text();
            const data = JSON.parse(fileContent);

            let currentBatch = writeBatch(firestore);
            let writeCount = 0;

            for (const collectionName of collectionsToImport) {
                const documents = data[collectionName];
                if (Array.isArray(documents)) {
                    for (const docData of documents) {
                        if (docData.id) {
                            let docRef;
                            // Special handling for subcollections based on export logic
                            if (collectionName === 'sheets' && docData.workbookId) {
                                docRef = doc(firestore, `workbooks/${docData.workbookId}/sheets`, docData.id);
                            } else if (collectionName === 'chat_messages' && docData.chatId) {
                                docRef = doc(firestore, `chats/${docData.chatId}/messages`, docData.id);
                            } else {
                                docRef = doc(firestore, collectionName, docData.id);
                            }
                            
                            const { id, ...dataToSet } = docData;
                            currentBatch.set(docRef, dataToSet);
                            writeCount++;

                            if (writeCount >= 499) {
                                await currentBatch.commit();
                                currentBatch = writeBatch(firestore);
                                writeCount = 0;
                                toast({ title: 'Importing...', description: `Writing a batch of documents for ${collectionName}...` });
                            }
                        }
                    }
                }
            }
            
            if (writeCount > 0) {
                await currentBatch.commit();
            }

            toast({ title: 'Import Complete', description: 'Selected data has been restored from the backup file.' });

        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Import Failed', description: `An error occurred: ${err.message}` });
        } finally {
            setLoading(null);
            setFileToImport(null);
            setImportPreview(null);
            setCollectionsToImport([]);
        }
    };

    const handleClearDatabase = async () => {
        setLoading('clear_db');
        const collectionsToDelete = [
            'organizations', 'users', 'system_configs', 'departments',
            'requisitions', 'tasks', 'attendance', 'announcements', 
            'workbooks', 'feedback', 'chats'
        ];
        const subCollectionGroups = ['sheets', 'messages'];
        
        try {
            const allCollections = [...collectionsToDelete, ...subCollectionGroups];
            for (const name of allCollections) {
                 toast({ title: 'Clearing Database...', description: `Deleting all documents from ${name}...` });
                const isGroup = subCollectionGroups.includes(name);
                const ref = isGroup ? collectionGroup(firestore, name) : collection(firestore, name);
                const snapshot = await getDocs(ref);

                let batch = writeBatch(firestore);
                let count = 0;
                for (const doc of snapshot.docs) {
                    batch.delete(doc.ref);
                    count++;
                    if (count === 499) {
                        await batch.commit();
                        batch = writeBatch(firestore);
                        count = 0;
                    }
                }
                if (count > 0) await batch.commit();
            }
             toast({ title: 'Database Cleared', description: 'All data has been successfully deleted.' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Clear Failed', description: `An error occurred: ${err.message}` });
        } finally {
            setLoading(null);
            setClearDbConfirmation('');
        }
    };

    const anyLoading = !!loading || isCreatingBackup;

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
    
    const isImportButtonDisabled = !importPreview || collectionsToImport.length === 0 || anyLoading || isParsing;


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>Backup, restore, and manage your application data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="offline" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="offline">Offline Backup</TabsTrigger>
                            <TabsTrigger value="online">Online Backup</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="offline" className="mt-4 space-y-6">
                            <Card>
                            <CardHeader>
                                <CardTitle>Export to JSON</CardTitle>
                                <CardDescription>Download collections as JSON files for local analysis or manual backup.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {exportOptions.map(option => (
                                            <Button 
                                                key={option.id}
                                                variant="outline"
                                                onClick={() => handleExport(option.id)}
                                                disabled={anyLoading}
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
                                            disabled={anyLoading}
                                        >
                                            {loading === 'all' ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                                            Export All Data (Full Snapshot)
                                        </Button>
                                    </div>
                            </CardContent>
                            </Card>
                            
                            <Card>
                            <CardHeader>
                                <CardTitle>Import from JSON</CardTitle>
                                <CardDescription>Select a JSON backup file to preview and selectively import its contents. This is destructive and will overwrite existing data.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                    <div className="space-y-4">
                                        <div className="space-y-4">
                                            <Input type="file" accept=".json" onChange={handleFileSelect} disabled={isParsing || anyLoading}/>
                                            {isParsing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" /> Parsing file...</div>}
                                            {importPreview && (
                                                <Card>
                                                    <CardHeader className="flex-row items-center justify-between">
                                                        <CardTitle className="text-base">Import Preview</CardTitle>
                                                         <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id="select-all-collections"
                                                                checked={collectionsToImport.length === Object.keys(importPreview).length}
                                                                onCheckedChange={(checked) => setCollectionsToImport(checked ? Object.keys(importPreview) : [])}
                                                            />
                                                            <label htmlFor="select-all-collections" className="text-sm font-medium leading-none">Select All</label>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm font-medium mb-2">Select collections to import:</p>
                                                        <div className="text-sm text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                                                            {Object.entries(importPreview).map(([key, value]) => (
                                                                <div key={key} className="flex items-center space-x-2">
                                                                     <Checkbox
                                                                        id={`collection-${key}`}
                                                                        checked={collectionsToImport.includes(key)}
                                                                        onCheckedChange={(checked) => {
                                                                            setCollectionsToImport(prev => 
                                                                                checked ? [...prev, key] : prev.filter(c => c !== key)
                                                                            )
                                                                        }}
                                                                    />
                                                                    <label htmlFor={`collection-${key}`} className="flex-1">
                                                                        <strong>{key}</strong> ({value} documents)
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                        <div className="border-t pt-4">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button className="w-full" disabled={isImportButtonDisabled}>
                                                        {loading === 'import' ? <Loader2 className="mr-2 animate-spin" /> : <Upload className="mr-2" />}
                                                        Import Selected Data
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This is a destructive action that cannot be undone. It will overwrite any existing documents with the same ID in the selected collections. Are you sure you want to proceed?
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
                            </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="online" className="mt-4 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cloud Snapshot Management</CardTitle>
                                    <CardDescription>Create and manage automated backups of your entire Firestore database to a secure cloud bucket.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={handleCreateBackup} disabled={anyLoading}>
                                        {isCreatingBackup ? <Loader2 className="mr-2 animate-spin" /> : <PlusCircle className="mr-2" />}
                                        Create New Cloud Backup
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Available Backups</CardTitle>
                                    <CardDescription>List of available cloud backups. Select one to restore.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
                                        <CloudCog className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <p className="mt-2 text-sm text-muted-foreground">Backup listing feature coming soon.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <ShieldAlert/> Destructive Zone
                    </CardTitle>
                    <CardDescription>
                        Be very careful. These actions are irreversible and will result in permanent data loss.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={anyLoading}>
                                {loading === 'clear_db' ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2" />}
                                Clear Entire Database
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete ALL data in the database, including users, organizations, and all associated content. To confirm, please type <code className="font-mono bg-muted text-destructive-foreground px-1 py-0.5 rounded-sm">DELETE ALL DATA</code> below.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                             <Input 
                                placeholder="Type confirmation phrase here"
                                value={clearDbConfirmation}
                                onChange={(e) => setClearDbConfirmation(e.target.value)}
                             />
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setClearDbConfirmation('')}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearDatabase} disabled={clearDbConfirmation !== 'DELETE ALL DATA'}>
                                    Yes, I understand, clear everything
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
