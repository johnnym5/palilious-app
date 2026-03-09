'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Sheet } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
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
import { EditRowDialog } from './EditRowDialog';
import { SheetDataCard } from './SheetDataCard';
import { Checkbox } from '../ui/checkbox';


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
    const [selectedRows, setSelectedRows] = useState<number[]>([]);


    // Update local state if the sheet prop changes (e.g., user switches tabs)
    useEffect(() => {
        setData(sheet.data ? JSON.parse(JSON.stringify(sheet.data)) : []);
        setHeaders(sheet.headers ? [...sheet.headers] : []);
        setSelectedRows([]);
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
    
    const handleFieldChangeOnCard = (rowIndex: number, field: string, value: any) => {
        const newData = [...data];
        newData[rowIndex][field] = value;
        setData(newData);
        saveChanges({ data: newData }, `Updated ${field} for row.`);
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
    };

    const handleDeleteSelectedRows = () => {
        if (selectedRows.length === 0 || !permissions.canEdit) return;
        const updatedData = data.filter((_, index) => !selectedRows.includes(index));
        setData(updatedData);
        saveChanges({ data: updatedData }, `${selectedRows.length} row(s) deleted.`);
        setSelectedRows([]);
    };
    
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
    };
    
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

    const handleSelectRow = (rowIndex: number, checked: boolean) => {
        if (checked) {
            setSelectedRows(prev => [...prev, rowIndex]);
        } else {
            setSelectedRows(prev => prev.filter(idx => idx !== rowIndex));
        }
    };
    
    const handleSelectAll = () => {
        if (selectedRows.length === filteredData.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredData.map(row => row.__originalIndex));
        }
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
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-2 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={`Search ${sheet.name}...`}
                        className="pl-9 h-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {permissions.canEdit && (
                    <>
                         <div className="flex items-center space-x-2">
                             <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={filteredData.length === 0}>
                                 <Checkbox checked={selectedRows.length > 0 && selectedRows.length === filteredData.length} />
                                 <span className="ml-2">Select All</span>
                             </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button variant="destructive" size="sm" disabled={selectedRows.length === 0}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedRows.length})
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete {selectedRows.length} selected row(s).</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelectedRows} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         </div>
                        <AddRowDialog open={isAddRowOpen} onOpenChange={setIsAddRowOpen} sheet={sheet}>
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                New Asset
                            </Button>
                        </AddRowDialog>
                    </>
                )}
            </div>
            
            <ScrollArea className="flex-grow bg-muted/20 p-4">
                {filteredData.length === 0 ? (
                    <div className="text-center py-24 text-sm text-muted-foreground">
                        {searchTerm ? "No rows match your search." : "No rows yet. Click 'New Asset' to start."}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredData.map((row) => (
                           <SheetDataCard 
                                key={row.__originalIndex}
                                rowData={row}
                                rowIndex={row.__originalIndex}
                                headers={headers}
                                sheet={sheet}
                                isSelected={selectedRows.includes(row.__originalIndex)}
                                onSelect={handleSelectRow}
                                onEdit={() => setRowToEdit({ rowIndex: row.__originalIndex, data: row })}
                                onDelete={() => setRowToDelete(row.__originalIndex)}
                                onFieldChange={handleFieldChangeOnCard}
                                permissions={permissions}
                           />
                        ))}
                    </div>
                )}
            </ScrollArea>

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
