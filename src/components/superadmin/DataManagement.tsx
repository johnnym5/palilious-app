'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDatabase } from '@/firebase';
import { collection, getDocs, collectionGroup, writeBatch, doc, query, where } from 'firebase/firestore';
import { ref, get, child, set, onValue } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, Upload, CloudCog, Trash2, ShieldAlert, PlusCircle, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Organization } from '@/lib/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';


const COLLECTIONS = [
    { id: 'requisitions', name: 'Requisitions' },
    { id: 'tasks', name: 'Tasks' },
    { id: 'attendance', name: 'Attendance' },
    { id: 'announcements', name: 'Announcements' },
    { id: 'workbooks', name: 'Workbooks' },
    { id: 'feedback', name: 'Feedback' },
    { id: 'chats', name: 'Chats' },
    { id: 'departments', name: 'Departments' },
    { id: 'users', name: 'Users' },
    { id: 'system_configs', name: 'System Configs' },
    { id: 'organizations', name: 'Organizations' },
];

export function DataManagement() {
    const firestore = useFirestore();
    const database = useDatabase();
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);

    // Offline state
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<Record<string, number> | null>(null);
    const [collectionsToImport, setCollectionsToImport] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    
    // Online state
    const [onlineBackups, setOnlineBackups] = useState<string[]>([]);
    const [selectedOnlineBackup, setSelectedOnlineBackup] = useState<string | null>(null);
    const [onlineBackupPreview, setOnlineBackupPreview] = useState<Record<string, number> | null>(null);
    const [collectionsToRestore, setCollectionsToRestore] = useState<string[]>([]);


    // Destructive actions state
    const [targetOrg, setTargetOrg] = useState<string>('__ALL__');
    const [collectionToDelete, setCollectionToDelete] = useState<string>('');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    const { data: organizations, isLoading: areOrgsLoading } = useCollection<Organization>(
        useMemoFirebase(() => collection(firestore, 'organizations'), [firestore])
    );
    
    useEffect(() => {
        if (!database) return;
        const backupsRef = ref(database, 'backups');
        const unsubscribe = onValue(backupsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const backupKeys = Object.keys(data).sort().reverse();
                setOnlineBackups(backupKeys);
            } else {
                setOnlineBackups([]);
            }
        });

        return () => unsubscribe();
    }, [database]);

    const handleCreateBackup = async () => {
        if (!firestore || !database) return;
        setLoading('cloud-backup');
        const backupTimestamp = new Date().toISOString();

        try {
            toast({ title: 'Starting cloud backup...', description: 'Fetching all data from Firestore.' });

            const allData: Record<string, any[]> = {};
            for (const name of COLLECTIONS.map(c => c.id)) {
                 const querySnapshot = await getDocs(collection(firestore, name));
                 allData[name] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            const sheetsSnapshot = await getDocs(collectionGroup(firestore, 'sheets'));
            allData['sheets'] = sheetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const messagesSnapshot = await getDocs(collectionGroup(firestore, 'messages'));
            allData['chat_messages'] = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            toast({ title: 'Data fetched', description: 'Writing data to Realtime Database. This may take a moment.' });

            const backupRef = ref(database, `backups/${backupTimestamp}`);
            await set(backupRef, allData);

            toast({ title: 'Cloud Backup Complete', description: `Snapshot created successfully.` });

        } catch (e: any) {
             toast({ variant: 'destructive', title: 'Backup Failed', description: e.message });
        } finally {
            setLoading(null);
        }
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
    
    const handleExportAll = async () => {
        if (!firestore) return;
        setLoading('all');
        try {
            const collectionsToExport = COLLECTIONS.map(c => c.id);
            const allData: Record<string, any[]> = {};
            
            for (const name of collectionsToExport) {
                 const querySnapshot = await getDocs(collection(firestore, name));
                 allData[name] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            
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
                    setCollectionsToImport(collectionsFromFile);
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
    
    const handleSelectOnlineBackup = async (backupId: string) => {
        if (!database) return;
        setLoading('preview-online');
        setSelectedOnlineBackup(backupId);
        setOnlineBackupPreview(null);
        setCollectionsToRestore([]);

        try {
            const backupRef = ref(database, `backups/${backupId}`);
            const snapshot = await get(backupRef);
            if(snapshot.exists()) {
                const data = snapshot.val();
                const preview: Record<string, number> = {};
                const collectionsFromBackup: string[] = [];
                for(const key in data) {
                    if (Array.isArray(data[key])) {
                        preview[key] = data[key].length;
                        collectionsFromBackup.push(key);
                    }
                }
                setOnlineBackupPreview(preview);
                setCollectionsToRestore(collectionsFromBackup);
            }
        } catch(e: any) {
             toast({ variant: 'destructive', title: 'Preview Failed', description: e.message });
        } finally {
            setLoading(null);
        }
    }

    const handleImport = async () => {
        if (!fileToImport || collectionsToImport.length === 0) return;
        setLoading('import');
        try {
            const fileContent = await fileToImport.text();
            const data = JSON.parse(fileContent);
            let writeCount = 0;
            let currentBatch = writeBatch(firestore);

            for (const collectionName of collectionsToImport) {
                const documents = data[collectionName];
                if (Array.isArray(documents)) {
                    for (const docData of documents) {
                        if (docData.id) {
                            let docRef;
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
                            }
                        }
                    }
                }
            }
            if (writeCount > 0) await currentBatch.commit();
            toast({ title: 'Import Complete', description: 'Selected data has been restored.' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Import Failed', description: `An error occurred: ${err.message}` });
        } finally {
            setLoading(null);
            setFileToImport(null);
            setImportPreview(null);
            setCollectionsToImport([]);
        }
    };

    const getDeleteConfirmationPhrase = () => {
        const collectionName = COLLECTIONS.find(c => c.id === collectionToDelete)?.name.toUpperCase() || 'ENTIRE DATABASE';
        if (targetOrg === '__ALL__') {
            return `DELETE ALL ${collectionName}`;
        }
        const orgName = organizations?.find(o => o.id === targetOrg)?.name.toUpperCase() || 'UNKNOWN ORG';
        return `DELETE ${collectionName} FROM ${orgName}`;
    };

    const handleDeleteData = async () => {
        setLoading('delete');
        try {
            const collectionsToDeleteList = collectionToDelete === '__ALL__' ? COLLECTIONS.map(c => c.id) : [collectionToDelete];
            
            for (const name of collectionsToDeleteList) {
                toast({ title: 'Deletion in Progress...', description: `Querying documents in ${name}...` });
                let q = query(collection(firestore, name));
                if (targetOrg !== '__ALL__') {
                    q = query(q, where('orgId', '==', targetOrg));
                }
                
                const snapshot = await getDocs(q);
                if (snapshot.empty) continue;

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
                toast({ title: 'Deletion in Progress...', description: `Deleted ${snapshot.size} documents from ${name}.` });
            }

            toast({ title: 'Deletion Complete', description: 'The selected data has been permanently removed.' });

        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: `An error occurred: ${err.message}` });
        } finally {
            setLoading(null);
            setIsDeleteAlertOpen(false);
            setDeleteConfirmation('');
        }
    };

    const anyLoading = !!loading || areOrgsLoading;

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Backup & Export</CardTitle>
                    <CardDescription>Create offline (JSON) or online (Realtime Database) backups of your Firestore data.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button className="w-full" onClick={handleExportAll} disabled={anyLoading}>
                        {loading === 'all' ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                        Export All to JSON (Offline)
                    </Button>
                     <Button onClick={handleCreateBackup} disabled={anyLoading}>
                        {loading === 'cloud-backup' ? <Loader2 className="mr-2 animate-spin" /> : <PlusCircle className="mr-2" />}
                        Create Cloud Snapshot (Online)
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Restore & Import</CardTitle>
                    <CardDescription>Restore data from an offline JSON backup or an online cloud snapshot.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Tabs defaultValue="offline">
                     <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="offline">Offline</TabsTrigger>
                        <TabsTrigger value="online">Online</TabsTrigger>
                     </TabsList>
                     <TabsContent value="offline" className="pt-4">
                         <div className="p-4 border rounded-lg space-y-4">
                            <Label htmlFor="import-file">Import from JSON</Label>
                            <Input id="import-file" type="file" accept=".json" onChange={handleFileSelect} disabled={isParsing || anyLoading}/>
                            {isParsing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" /> Parsing file...</div>}
                            {importPreview && (
                                <Card>
                                    <CardHeader className="flex-row items-center justify-between pb-4"><CardTitle className="text-base">Import Preview</CardTitle>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="select-all-import" checked={collectionsToImport.length === Object.keys(importPreview).length} onCheckedChange={(checked) => setCollectionsToImport(checked ? Object.keys(importPreview) : [])}/>
                                            <label htmlFor="select-all-import" className="text-sm font-medium">Select All</label>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                                            {Object.entries(importPreview).map(([key, value]) => (
                                                <div key={key} className="flex items-center space-x-2">
                                                    <Checkbox id={`import-${key}`} checked={collectionsToImport.includes(key)} onCheckedChange={(checked) => setCollectionsToImport(prev => checked ? [...prev, key] : prev.filter(c => c !== key))}/>
                                                    <label htmlFor={`import-${key}`} className="flex-1"><strong>{key}</strong> ({value} documents)</label>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="w-full" disabled={!importPreview || collectionsToImport.length === 0 || anyLoading || isParsing}>
                                        <Upload className="mr-2" /> Import Selected Data
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This is a destructive action that will overwrite existing documents with the same ID. Are you sure you want to proceed?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleImport} className="bg-destructive hover:bg-destructive/90">Yes, Start Import</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                     </TabsContent>
                     <TabsContent value="online" className="pt-4">
                         <div className="p-4 border rounded-lg space-y-4">
                            <h3 className="font-semibold text-sm">Available Cloud Backups</h3>
                            {onlineBackups.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No cloud backups found.</p>}
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {onlineBackups.map(key => (
                                    <div key={key} onClick={() => handleSelectOnlineBackup(key)} className="flex items-center justify-between p-2 border rounded-md cursor-pointer hover:bg-accent">
                                        <div className="flex items-center gap-2">
                                            <Server className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-mono text-xs">{new Date(key).toLocaleString()}</span>
                                        </div>
                                        {loading === 'preview-online' && selectedOnlineBackup === key && <Loader2 className="animate-spin" />}
                                    </div>
                                ))}
                            </div>
                            {onlineBackupPreview && (
                                <Card>
                                     <CardHeader className="flex-row items-center justify-between pb-4"><CardTitle className="text-base">Restore Preview</CardTitle>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="select-all-restore" checked={collectionsToRestore.length === Object.keys(onlineBackupPreview).length} onCheckedChange={(checked) => setCollectionsToRestore(checked ? Object.keys(onlineBackupPreview) : [])}/>
                                            <label htmlFor="select-all-restore" className="text-sm font-medium">Select All</label>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                       <div className="text-sm text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                                            {Object.entries(onlineBackupPreview).map(([key, value]) => (
                                                <div key={key} className="flex items-center space-x-2">
                                                    <Checkbox id={`restore-${key}`} checked={collectionsToRestore.includes(key)} onCheckedChange={(checked) => setCollectionsToRestore(prev => checked ? [...prev, key] : prev.filter(c => c !== key))}/>
                                                    <label htmlFor={`restore-${key}`} className="flex-1"><strong>{key}</strong> ({value} documents)</label>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            <Button disabled className="w-full">
                                <CloudCog className="mr-2" /> Restore from Cloud (Coming Soon)
                            </Button>
                         </div>
                     </TabsContent>
                   </Tabs>
                </CardContent>
            </Card>

            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><ShieldAlert/> Destructive Zone</CardTitle>
                    <CardDescription>Perform irreversible data deletion operations with granular control.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Target Organization</Label>
                            <Select value={targetOrg} onValueChange={setTargetOrg} disabled={anyLoading}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__ALL__">All Organizations</SelectItem>
                                    {organizations?.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Data to Delete</Label>
                            <Select value={collectionToDelete} onValueChange={setCollectionToDelete} disabled={anyLoading}>
                                <SelectTrigger><SelectValue placeholder="Select a data collection..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__ALL__">ENTIRE DATABASE</SelectItem>
                                    <Separator />
                                    {COLLECTIONS.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                     </div>
                      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full" disabled={anyLoading || !collectionToDelete}>
                                <Trash2 className="mr-2" /> Delete Selected Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely, positively sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This is your final confirmation. This action is irreversible. To proceed, please type the following phrase exactly: <br />
                                    <code className="font-mono bg-muted text-foreground px-2 py-1 rounded-sm mt-2 block text-center">{getDeleteConfirmationPhrase()}</code>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                             <Input placeholder="Type confirmation phrase here" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} />
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteData} disabled={deleteConfirmation !== getDeleteConfirmationPhrase() || loading === 'delete'}>
                                    {loading === 'delete' && <Loader2 className='animate-spin' />} I understand, delete the data
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
