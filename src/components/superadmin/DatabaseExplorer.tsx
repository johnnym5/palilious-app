'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Database, FileJson, FileText, ChevronRight, Loader2 } from 'lucide-react';

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

export function DatabaseExplorer() {
    const firestore = useFirestore();
    const [collections] = useState(STATIC_COLLECTIONS);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [documents, setDocuments] = useState<{ id: string }[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [isLoadingDoc, setIsLoadingDoc] = useState(false);
    
    useEffect(() => {
        if (selectedCollection) {
            const fetchDocuments = async () => {
                setIsLoadingDocs(true);
                setDocuments([]);
                setSelectedDocument(null);
                setSelectedDocumentId(null);
                try {
                    const querySnapshot = await getDocs(collection(firestore, selectedCollection));
                    const docs = querySnapshot.docs.map(d => ({ id: d.id }));
                    setDocuments(docs);
                } catch (error) {
                    console.error("Error fetching documents:", error);
                } finally {
                    setIsLoadingDocs(false);
                }
            };
            fetchDocuments();
        }
    }, [selectedCollection, firestore]);

    const handleSelectDocument = async (docId: string) => {
        if (!selectedCollection) return;
        setIsLoadingDoc(true);
        setSelectedDocumentId(docId);
        setSelectedDocument(null);
        try {
            const docRef = doc(firestore, selectedCollection, docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSelectedDocument({ id: docSnap.id, ...docSnap.data() });
            } else {
                setSelectedDocument({ error: "Document not found." });
            }
        } catch (error) {
            console.error("Error fetching document:", error);
            setSelectedDocument({ error: "Failed to fetch document." });
        } finally {
            setIsLoadingDoc(false);
        }
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 border rounded-lg h-[60vh] overflow-hidden">
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
                <div className="p-3 border-b font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" /> Documents
                </div>
                <ScrollArea className="flex-1">
                    {isLoadingDocs ? (
                        <div className="p-3 space-y-2">
                            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                        </div>
                    ) : documents.length > 0 ? (
                        documents.map(d => (
                             <div
                                key={d.id}
                                onClick={() => handleSelectDocument(d.id)}
                                className={cn(
                                    "p-3 text-sm font-mono cursor-pointer hover:bg-accent truncate",
                                    selectedDocumentId === d.id && "bg-accent"
                                )}
                            >
                                {d.id}
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            {selectedCollection ? "No documents in this collection." : "Select a collection to view documents."}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Document Viewer Column */}
            <div className="flex flex-col">
                 <div className="p-3 border-b font-semibold text-sm flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-muted-foreground" /> Data Viewer
                </div>
                <ScrollArea className="flex-1 bg-muted/30">
                    {isLoadingDoc && (
                         <div className="p-4 flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-muted-foreground" />
                         </div>
                    )}
                    {selectedDocument ? (
                        <pre className="text-xs p-4 overflow-x-auto">
                            <code>
                                {JSON.stringify(selectedDocument, null, 2)}
                            </code>
                        </pre>
                    ) : (
                         <div className="p-4 text-center text-xs text-muted-foreground">
                           {!isLoadingDoc && "Select a document to view its data."}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
