'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Database, FileJson, FileText, ChevronRight, Loader2, Save, Trash2, PlusCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


const STATIC_COLLECTIONS = [
    { id: 'organizations', name: 'Organizations' },
    { id: 'users', name: 'Users' },
    { id: 'system_configs', name: 'System Configs' },
    { id: 'departments', name: 'Departments' },
    { id: 'requisitions', name: 'Requisitions' },
    { id: 'tasks', name: 'Tasks' },
    { id: 'attendance', name: 'Attendance' },
    { id: 'announcements', name: 'Announcements' },
    { id: 'workbooks', name: 'Workbooks' },
    { id: 'chats', name: 'Chats' },
    { id: 'feedback', name: 'Feedback' },
];

const getDisplayName = (doc: any): string => {
    return doc.title || doc.name || doc.fullName || doc.serialNo || 'Untitled Document';
}

export function DatabaseExplorer() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [collections] = useState(STATIC_COLLECTIONS);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    
    // State for documents list
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    
    // State for selected documents (for bulk actions)
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    
    // State for the currently viewed/edited document
    const [viewedDocument, setViewedDocument] = useState<any | null>(null);
    const [editedJson, setEditedJson] = useState<string>('');
    const [isLoadingDoc, setIsLoadingDoc] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fetchDocuments = useCallback(async (collectionName: string) => {
        setIsLoadingDocs(true);
        setDocuments([]);
        setViewedDocument(null);
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
        }
    }, [selectedCollection, fetchDocuments]);

    const handleSelectDocument = useCallback(async (docId: string) => {
        if (!selectedCollection) return;
        setIsLoadingDoc(true);
        setViewedDocument(null);
        setEditedJson('');
        try {
            const docRef = doc(firestore, selectedCollection, docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const docData = { id: docSnap.id, ...docSnap.data() };
                setViewedDocument(docData);
                setEditedJson(JSON.stringify(docData, null, 2));
            } else {
                setViewedDocument({ error: "Document not found." });
                setEditedJson('{"error": "Document not found."}');
            }
        } catch (error) {
            console.error("Error fetching document:", error);
             setViewedDocument({ error: "Failed to fetch document." });
             setEditedJson('{"error": "Failed to fetch document."}');
        } finally {
            setIsLoadingDoc(false);
        }
    }, [selectedCollection, firestore]);
    
    const handleSave = async () => {
        if (!viewedDocument || !selectedCollection) return;
        setIsSaving(true);
        try {
            const updatedData = JSON.parse(editedJson);
            // Ensure ID is not part of the data being written
            const { id, ...dataToWrite } = updatedData;
            const docRef = doc(firestore, selectedCollection, viewedDocument.id);
            setDocumentNonBlocking(docRef, dataToWrite, { merge: false });
            toast({ title: 'Success', description: `Document ${viewedDocument.id} has been saved.` });
            
            // Refresh the document list to show changes
            await fetchDocuments(selectedCollection);

        } catch (e: any) {
            console.error("Save error:", e);
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message || 'Invalid JSON format.' });
        } finally {
            setIsSaving(false);
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 border rounded-lg h-[70vh] overflow-hidden">
            {/* Collections Column */}
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

            {/* Documents Column */}
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
                                    viewedDocument?.id === d.id && "bg-accent"
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
                             <Button variant="destructive" className="flex-1" disabled={selectedDocIds.length === 0}>
                                <Trash2 className="mr-2" /> Delete ({selectedDocIds.length})
                            </Button>
                        </AlertDialogTrigger>
                        {/* AlertDialogContent for delete confirmation - not implemented yet */}
                    </AlertDialog>
                    <Button variant="outline" className="flex-1" disabled>
                        <PlusCircle className="mr-2" /> Add New
                    </Button>
                </div>
            </div>

            {/* Document Viewer Column */}
            <div className="flex flex-col">
                 <div className="p-3 border-b font-semibold text-sm flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-muted-foreground" /> Data Viewer
                </div>
                <ScrollArea className="flex-1 bg-muted/30">
                    {isLoadingDoc ? (
                         <div className="p-4 flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-muted-foreground" />
                         </div>
                    ) : viewedDocument ? (
                        <Textarea
                            value={editedJson}
                            onChange={e => setEditedJson(e.target.value)}
                            className="w-full h-full text-xs font-mono bg-transparent border-0 rounded-none resize-none focus-visible:ring-0"
                            placeholder="Document JSON data..."
                        />
                    ) : (
                         <div className="p-4 text-center text-xs text-muted-foreground">
                           {!isLoadingDoc && "Select a document to view its data."}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t">
                    <Button className="w-full" onClick={handleSave} disabled={isSaving || isLoadingDoc || !viewedDocument || !!viewedDocument.error}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
