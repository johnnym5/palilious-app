'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Sheet } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, MoreVertical, FileDown, Settings, Type, Hash, Calendar as CalendarIcon, ChevronsUpDown, Search } from 'lucide-react';
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
import { AddColumnDialog } from './AddColumnDialog';
import { ConfigureColumnDialog } from './ConfigureColumnDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddRowDialog } from './AddRowDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { EditRowDialog } from './EditRowDialog';


interface SheetDataTableProps {
  sheet: Sheet;
  permissions: {
    canEdit: boolean;
  };
}

const TYPE_ICONS: Record<string, React.ElementType> = {
    text: Type,
    number: Hash,
    date: CalendarIcon,
    select: ChevronsUpDown,
}

export function SheetDataTable({ sheet, permissions }: SheetDataTableProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [data, setData] = useState<Record<string, any>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
    const [isAddRowOpen, setIsAddRowOpen] = useState(false);
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
    const [rowToDelete, setRowToDelete] = useState<number | null>(null);
    const [columnToConfigure, setColumnToConfigure] = useState<string | null>(null);
    const [rowToEdit, setRowToEdit] = useState<{ rowIndex: number; data: Record<string, any> } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');


    // Update local state if the sheet prop changes (e.g., user switches tabs)
    useEffect(() => {
        setData(sheet.data ? JSON.parse(JSON.stringify(sheet.data)) : []);
        setHeaders(sheet.headers ? [...sheet.headers] : []);
    }, [sheet]);
    
    const filteredData = useMemo(() => {
        if (!searchTerm) {
            return data.map((row, index) => ({ ...row, __originalIndex: index }));
        }
        return data
            .map((row, index) => ({ ...row, __originalIndex: index }))
            .filter(row =>
                headers.some(header =>
                    String(row[header] ?? '').toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
    }, [data, headers, searchTerm]);


    const saveChanges = (payload: { data?: Record<string, any>[]; headers?: string[], columnConfig?: any }, toastMessage: string) => {
        if (!firestore || Object.keys(payload).length === 0 || !permissions.canEdit) return;
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        updateDocumentNonBlocking(sheetRef, payload);
        toast({ title: 'Saved', description: toastMessage });
    };

    const handleSaveEdit = (rowIndex: number, updatedRowData: Record<string, any>) => {
        const newData = [...data];
        newData[rowIndex] = updatedRowData;
        setData(newData);
        saveChanges({ data: newData }, "Row updated successfully.");
    };

    const handleDeleteRow = () => {
        if (rowToDelete === null || !permissions.canEdit) return;
        const updatedData = data.filter((_, index) => index !== rowToDelete);
        setData(updatedData);
        saveChanges({ data: updatedData }, 'The row has been deleted.');
        setRowToDelete(null);
    }
    
    const handleDeleteColumn = () => {
        if (!columnToDelete || !permissions.canEdit) return;

        const newHeaders = headers.filter(h => h !== columnToDelete);
        const newColumnConfig = { ...sheet.columnConfig };
        delete newColumnConfig[columnToDelete];

        const newData = data.map(row => {
            const newRow = {...row};
            delete newRow[columnToDelete];
            return newRow;
        });

        setHeaders(newHeaders);
        setData(newData);
        saveChanges({ data: newData, headers: newHeaders, columnConfig: newColumnConfig }, `Column "${columnToDelete}" has been deleted.`);
        setColumnToDelete(null);
    }
    
    const handleExport = () => {
        const sheetData = [
            headers, // First row is headers
            ...data.map(row => headers.map(header => row[header])) // Subsequent rows are data
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        XLSX.writeFile(wb, `${sheet.workbookId}-${sheet.name}.xlsx`);
        toast({ title: 'Exporting...', description: `The sheet "${sheet.name}" is being downloaded.` });
    };

    if (!headers || headers.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-4">
                 <p className="text-sm font-semibold">This sheet is empty.</p>
                 {permissions.canEdit && (
                    <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} sheet={sheet}>
                        <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Add First Column
                        </Button>
                    </AddColumnDialog>
                 )}
             </div>
        );
    }

    return (
        <div className="h-[calc(100vh-24rem)] flex flex-col border rounded-lg">
            <div className="flex-shrink-0 border-b p-2 flex flex-col sm:flex-row items-center gap-2">
                 <ScrollArea className="w-full sm:w-auto">
                    <div className="flex items-center gap-2 pb-2 sm:pb-0">
                    {headers.map(header => {
                        const Icon = TYPE_ICONS[sheet.columnConfig?.[header]?.type || 'text'];
                        return (
                        <div key={header} className="group flex items-center gap-1 rounded-full border bg-secondary/50 px-3 py-1 text-sm whitespace-nowrap">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span>{header}</span>
                            {permissions.canEdit && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 -mr-2 opacity-50 group-hover:opacity-100">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => setColumnToConfigure(header)}>
                                            <Settings className="mr-2 h-4 w-4"/>
                                            Configure
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            className="text-destructive focus:text-destructive"
                                            onSelect={() => setColumnToDelete(header)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    )})}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="relative w-full sm:w-auto sm:ml-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search sheet..."
                        className="pl-9 h-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            
            <ScrollArea className="flex-grow bg-muted/20">
                {filteredData.length === 0 ? (
                    <div className="text-center py-24 text-sm text-muted-foreground">
                        {searchTerm ? "No rows match your search." : "No rows yet. Click 'Add Row' to start."}
                    </div>
                ) : (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredData.map((row) => {
                            const originalRowIndex = row.__originalIndex;
                            return (
                                <Card key={originalRowIndex} className="group flex flex-col">
                                    <CardHeader className="flex-row items-start justify-between pb-2">
                                        <CardTitle className="text-base line-clamp-2 pr-2">{row[headers[0]] || 'Untitled Row'}</CardTitle>
                                        {permissions.canEdit && (
                                            <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 group-hover:opacity-100 shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => setRowToEdit({ rowIndex: originalRowIndex, data: row })}>Edit Row</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setRowToDelete(originalRowIndex)} className="text-destructive focus:text-destructive">Delete Row</DropdownMenuItem>
                                            </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm flex-grow">
                                        {headers.slice(1, 5).map(header => ( // Show first 5 fields
                                        <div key={header}>
                                            <p className="font-semibold text-xs text-muted-foreground">{header}</p>
                                            <p className="text-foreground line-clamp-2">{row[header]}</p>
                                        </div>
                                        ))}
                                        {headers.length > 5 && <p className="text-xs text-muted-foreground pt-2">...and {headers.length - 5} more fields.</p>}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>
             <div className="flex-shrink-0 border-t p-2 flex items-center gap-2">
                 {permissions.canEdit && (
                        <>
                            <AddRowDialog open={isAddRowOpen} onOpenChange={setIsAddRowOpen} sheet={sheet}>
                                <Button variant="outline" size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Row
                                </Button>
                            </AddRowDialog>
                            <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} sheet={sheet}>
                                <Button variant="outline" size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Column
                                </Button>
                            </AddColumnDialog>
                        </>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export as Excel
                    </Button>
            </div>

            {rowToEdit && (
                <EditRowDialog
                    open={!!rowToEdit}
                    onOpenChange={(isOpen) => !isOpen && setRowToEdit(null)}
                    sheet={sheet}
                    rowData={rowToEdit.data}
                    onSave={(updatedData) => handleSaveEdit(rowToEdit.rowIndex, updatedData)}
                />
            )}
            
            {rowToDelete !== null && (
                 <AlertDialog open={rowToDelete !== null} onOpenChange={(isOpen) => !isOpen && setRowToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action will permanently delete this row.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteRow} className="bg-destructive hover:bg-destructive/90">
                                Delete Row
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

             {columnToConfigure && (
                <ConfigureColumnDialog
                    open={!!columnToConfigure}
                    onOpenChange={(isOpen) => !isOpen && setColumnToConfigure(null)}
                    sheet={sheet}
                    header={columnToConfigure}
                />
            )}

            {columnToDelete && (
                 <AlertDialog open={!!columnToDelete} onOpenChange={(isOpen) => !isOpen && setColumnToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Column "{columnToDelete}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. All data in this column will be permanently deleted.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteColumn} className="bg-destructive hover:bg-destructive/90">
                                Delete Column
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
