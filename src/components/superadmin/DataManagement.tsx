'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, getDocs, collectionGroup, writeBatch, doc, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, Upload, CloudCog, Trash2, ShieldAlert, PlusCircle } from 'lucide-react';
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
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<Record<string, number> | null>(null);
    const [collectionsToImport, setCollectionsToImport] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    
    // State for destructive actions
    const [targetOrg, setTargetOrg] = useState<string>('__ALL__');
    const [collectionToDelete, setCollectionToDelete] = useState<string>('');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    const { data: organizations, isLoading: areOrgsLoading } = useCollection<Organization>(
        useMemoFirebase(() => collection(firestore, 'organizations'), [firestore])
    );

    const handleCreateBackup = () => {
        setIsCreatingBackup(true);
        toast({
            title: "Backup In Progress...",
            description: "Your request to create a cloud backup has been received. This is a backend operation and may take several minutes.",
        });

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

    const anyLoading = !!loading || isCreatingBackup || areOrgsLoading;

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Backup & Export</CardTitle>
                    <CardDescription>Create offline (JSON) or online (Cloud) backups of your Firestore data.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button className="w-full" onClick={handleExportAll} disabled={anyLoading}>
                        {loading === 'all' ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                        Export All to JSON (Offline)
                    </Button>
                     <Button onClick={handleCreateBackup} disabled={anyLoading}>
                        {isCreatingBackup ? <Loader2 className="mr-2 animate-spin" /> : <PlusCircle className="mr-2" />}
                        Create Cloud Snapshot (Online)
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Restore & Import</CardTitle>
                    <CardDescription>Restore data from an offline JSON backup or an online cloud snapshot.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Import from JSON (Offline)</h3>
                        <div className="p-4 border rounded-lg space-y-4">
                            <Input type="file" accept=".json" onChange={handleFileSelect} disabled={isParsing || anyLoading}/>
                            {isParsing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" /> Parsing file...</div>}
                            {importPreview && (
                                <Card>
                                    <CardHeader className="flex-row items-center justify-between pb-4"><CardTitle className="text-base">Import Preview</CardTitle>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="select-all" checked={collectionsToImport.length === Object.keys(importPreview).length} onCheckedChange={(checked) => setCollectionsToImport(checked ? Object.keys(importPreview) : [])}/>
                                            <label htmlFor="select-all" className="text-sm font-medium">Select All</label>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                                            {Object.entries(importPreview).map(([key, value]) => (
                                                <div key={key} className="flex items-center space-x-2">
                                                    <Checkbox id={key} checked={collectionsToImport.includes(key)} onCheckedChange={(checked) => setCollectionsToImport(prev => checked ? [...prev, key] : prev.filter(c => c !== key))}/>
                                                    <label htmlFor={key} className="flex-1"><strong>{key}</strong> ({value} documents)</label>
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
                    </div>
                     <Separator />
                    <div>
                        <h3 className="font-semibold mb-2">Restore from Cloud Snapshot (Online)</h3>
                        <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
                            <CloudCog className="mx-auto h-12 w-12 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Cloud restore feature coming soon.</p>
                        </div>
                    </div>
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
                                    <code className="font-mono bg-muted text-destructive-foreground px-2 py-1 rounded-sm mt-2 block text-center">{getDeleteConfirmationPhrase()}</code>
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
