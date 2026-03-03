'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, getDoc, writeBatch, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Database, FileJson, FileText, ChevronRight, Loader2, Save, Trash2, PlusCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import backendConfig from '@/docs/backend.json';

const getDisplayName = (doc: any): string => {
    return doc.title || doc.name || doc.fullName || doc.serialNo || 'Untitled Document';
}

const IMMUTABLE_FIELDS = ['id', 'orgId', 'createdBy', 'createdAt', 'serialNo', 'email', 'username', 'userId', 'chatId', 'workbookId', 'ownerId', 'requesterId'];

// Maps collection names to their entity definitions in backend.json
const collectionSchemaMap: Record<string, any> = {};
backendConfig.firestore.structure.forEach(item => {
    const collectionName = item.path.split('/')[1];
    if (collectionName) {
        const entityName = item.definition.entityName;
        collectionSchemaMap[collectionName] = backendConfig.entities[entityName as keyof typeof backendConfig.entities];
    }
});


export function DatabaseExplorer() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [collections] = useState(Object.keys(collectionSchemaMap).map(id => ({ id, name: collectionSchemaMap[id].title })));
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    
    const [viewedDocument, setViewedDocument] = useState<any | null>(null);
    const [editedDocument, setEditedDocument] = useState<any | null>(null);
    const [viewedSchema, setViewedSchema] = useState<any | null>(null);

    const [isLoadingDoc, setIsLoadingDoc] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchDocuments = useCallback(async (collectionName: string) => {
        setIsLoadingDocs(true);
        setDocuments([]);
        setViewedDocument(null);
        setEditedDocument(null);
        setSelectedDocIds([]);
        try {
            const querySnapshot = await getDocs(collection(firestore, collectionName));
            const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setDocuments(docs);
        } catch (error) {
            console.error("Error fetching documents:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch documents.' });
        } finally {
            setIsLoadingDocs(false);
        }
    }, [firestore, toast]);
    
    useEffect(() => {
        if (selectedCollection) {
            fetchDocuments(selectedCollection);
            setViewedSchema(collectionSchemaMap[selectedCollection] || null);
        } else {
            setViewedSchema(null);
        }
    }, [selectedCollection, fetchDocuments]);

    const handleSelectDocument = useCallback(async (docId: string) => {
        if (!selectedCollection) return;
        setIsLoadingDoc(true);
        setViewedDocument(null);
        setEditedDocument(null);
        try {
            const docRef = doc(firestore, selectedCollection, docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const docData = { id: docSnap.id, ...docSnap.data() };
                setViewedDocument(docData);
                setEditedDocument(JSON.parse(JSON.stringify(docData))); // Deep copy for editing
            } else {
                 setEditedDocument({ error: "Document not found." });
            }
        } catch (error) {
            console.error("Error fetching document:", error);
            setEditedDocument({ error: "Failed to fetch document." });
        } finally {
            setIsLoadingDoc(false);
        }
    }, [selectedCollection, firestore]);
    
    const handleFieldChange = (key: string, value: any) => {
        setEditedDocument((prev: any) => ({ ...prev, [key]: value }));
    };
    
    const handleSave = async () => {
        if (!editedDocument || !selectedCollection || !viewedDocument) return;
        setIsSaving(true);
        try {
            // Safely merge changes to prevent losing fields not in the form
            const dataToWrite = { ...viewedDocument, ...editedDocument };
            const { id, ...payload } = dataToWrite;
            const docRef = doc(firestore, selectedCollection, id);
            await setDoc(docRef, payload); // Overwrite with merged data
            
            toast({ title: 'Success', description: `Document ${id} has been saved.` });
            
            await fetchDocuments(selectedCollection);

        } catch (e: any) {
            console.error("Save error:", e);
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

     const handleDeleteSelected = async () => {
        if (!selectedCollection || selectedDocIds.length === 0) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            selectedDocIds.forEach(id => {
                const docRef = doc(firestore, selectedCollection, id);
                batch.delete(docRef);
            });
            await batch.commit();

            toast({
                title: 'Success',
                description: `${selectedDocIds.length} document(s) have been deleted.`
            });

            setViewedDocument(null);
            setEditedDocument(null);
            setSelectedDocIds([]);
            fetchDocuments(selectedCollection);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleSelectAll = (checked: boolean | string) => {
        if (typeof checked === 'boolean') {
            setSelectedDocIds(checked ? documents.map(d => d.id) : []);
        }
    };

    const handleSingleSelect = (docId: string, checked: boolean) => {
        if (checked) {
            setSelectedDocIds(prev => [...prev, docId]);
        } else {
            setSelectedDocIds(prev => prev.filter(id => id !== docId));
        }
    };

    const renderField = (key: string, value: any) => {
        const schema = viewedSchema?.properties?.[key];
        const isLocked = IMMUTABLE_FIELDS.includes(key);

        if (typeof value === 'object' && value !== null) {
            return (
                 <div key={key} className="grid grid-cols-3 items-start gap-2">
                    <Label htmlFor={key} className="text-right pt-2 truncate">{key}</Label>
                    <Textarea 
                        id={key}
                        value={JSON.stringify(value, null, 2)}
                        disabled
                        className="col-span-2 font-mono text-xs bg-input"
                        rows={3}
                    />
                </div>
            )
        }
        
        if (schema?.type === 'boolean') {
            return (
                <div key={key} className="grid grid-cols-3 items-center gap-2">
                     <Label htmlFor={key} className="text-right">{key}</Label>
                     <div className="col-span-2 flex items-center">
                        <Switch 
                            id={key}
                            checked={!!value}
                            onCheckedChange={(checked) => handleFieldChange(key, checked)}
                            disabled={isLocked}
                        />
                     </div>
                </div>
            )
        }
        
        if (schema?.enum) {
             return (
                <div key={key} className="grid grid-cols-3 items-center gap-2">
                     <Label htmlFor={key} className="text-right">{key}</Label>
                     <Select value={value} onValueChange={(val) => handleFieldChange(key, val)} disabled={isLocked}>
                         <SelectTrigger className="col-span-2">
                             <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                            {schema.enum.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                         </SelectContent>
                     </Select>
                </div>
             )
        }

        return (
            <div key={key} className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor={key} className="text-right truncate">{key}</Label>
                <Input 
                    id={key}
                    type={schema?.type === 'number' ? 'number' : 'text'}
                    value={value ?? ''}
                    onChange={(e) => handleFieldChange(key, schema?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    disabled={isLocked}
                    className="col-span-2"
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 border rounded-lg h-[70vh] overflow-hidden">
            <div className="flex flex-col border-r">
                <div className="p-3 border-b font-semibold text-sm flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" /> Collections
                </div>
                <ScrollArea className="flex-1">
                    {collections.map(c => (
                        <div
                            key={c.id}
                            onClick={() => setSelectedCollection(c.id)}
                            className={cn(
                                "flex items-center justify-between p-3 text-sm cursor-pointer hover:bg-accent",
                                selectedCollection === c.id && "bg-accent"
                            )}
                        >
                            <span>{c.name}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                    ))}
                </ScrollArea>
            </div>

            <div className="flex flex-col border-r">
                <div className="p-3 border-b font-semibold text-sm flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" /> Documents ({documents.length})
                    </div>
                     <div className="flex items-center gap-2">
                        <Checkbox id="select-all" onCheckedChange={handleSelectAll} checked={documents.length > 0 && selectedDocIds.length === documents.length} />
                        <label htmlFor="select-all" className="text-xs">All</label>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    {isLoadingDocs ? (
                        <div className="p-3 space-y-2">
                            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : documents.length > 0 ? (
                        documents.map(d => (
                             <div
                                key={d.id}
                                onClick={() => handleSelectDocument(d.id)}
                                className={cn(
                                    "p-3 text-sm cursor-pointer hover:bg-accent border-b flex items-center gap-3",
                                    editedDocument?.id === d.id && "bg-accent"
                                )}
                            >
                                <Checkbox checked={selectedDocIds.includes(d.id)} onCheckedChange={(checked) => handleSingleSelect(d.id, !!checked)} onClick={e => e.stopPropagation()} />
                                <div className="truncate">
                                    <p className="font-medium">{getDisplayName(d)}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{d.id}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            {selectedCollection ? "No documents in this collection." : "Select a collection to view documents."}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t flex gap-2">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" className="flex-1" disabled={selectedDocIds.length === 0 || isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2" />}
                                Delete ({selectedDocIds.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the selected {selectedDocIds.length} document(s).
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                                    Yes, delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" className="flex-1" disabled>
                        <PlusCircle className="mr-2" /> Add New
                    </Button>
                </div>
            </div>

            <div className="flex flex-col">
                 <div className="p-3 border-b font-semibold text-sm flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-muted-foreground" /> Data Editor
                </div>
                <ScrollArea className="flex-1 bg-muted/30">
                    {isLoadingDoc ? (
                         <div className="p-4 flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-muted-foreground" />
                         </div>
                    ) : editedDocument && !editedDocument.error ? (
                        <div className="p-4 space-y-3">
                             {Object.keys(editedDocument).map(key => renderField(key, editedDocument[key]))}
                        </div>
                    ) : (
                         <div className="p-4 text-center text-xs text-muted-foreground h-full flex items-center justify-center">
                           {!isLoadingDoc && (editedDocument?.error || "Select a document to edit its data.")}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t">
                    <Button className="w-full" onClick={handleSave} disabled={isSaving || isLoadingDoc || !editedDocument || !!editedDocument.error}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
