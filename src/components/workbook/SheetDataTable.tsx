"use client";

import { useState, useEffect } from 'react';
import type { Sheet } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, MoreVertical, FileDown, Settings, Type, Hash, Calendar as CalendarIcon, ChevronsUpDown } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';

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
    const [editingCell, setEditingCell] = useState<{ rowIndex: number; header: string } | null>(null);
    const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
    const [columnToConfigure, setColumnToConfigure] = useState<string | null>(null);


    // Update local state if the sheet prop changes (e.g., user switches tabs)
    useEffect(() => {
        setData(sheet.data ? JSON.parse(JSON.stringify(sheet.data)) : []);
        setHeaders(sheet.headers ? [...sheet.headers] : []);
    }, [sheet]);

    const handleCellUpdate = (rowIndex: number, header: string, value: any) => {
        const newData = [...data];
        newData[rowIndex][header] = value;
        setData(newData);
    };

    const saveChanges = (payload: { data?: Record<string, any>[]; headers?: string[], columnConfig?: any }, toastMessage: string) => {
        if (!firestore || Object.keys(payload).length === 0 || !permissions.canEdit) return;
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        updateDocumentNonBlocking(sheetRef, payload);
        toast({ title: 'Saved', description: toastMessage });
    };

    const handleBlurSave = () => {
        setEditingCell(null); // Exit editing mode
        saveChanges({ data }, 'Your changes have been saved.');
    };

    const handleEnterSave = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setEditingCell(null);
            saveChanges({ data }, 'Your changes have been saved.');
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setData(sheet.data ? JSON.parse(JSON.stringify(sheet.data)) : []); // Revert changes
        }
    }

    const handleAddRow = () => {
        if (!permissions.canEdit) return;
        const newRow = headers.reduce((acc, header) => {
            acc[header] = '';
            return acc;
        }, {} as Record<string, any>);
        const updatedData = [...data, newRow];
        setData(updatedData);
        saveChanges({ data: updatedData }, 'A new row has been added.');
    };

    const handleDeleteRow = (rowIndexToDelete: number) => {
        if (!permissions.canEdit) return;
        const updatedData = data.filter((_, index) => index !== rowIndexToDelete);
        setData(updatedData);
        saveChanges({ data: updatedData }, 'The row has been deleted.');
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
        <div className="h-[60vh] flex flex-col">
            <ScrollArea className="flex-grow relative">
                <Table>
                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                        <TableRow>
                            {headers.map(header => {
                                const Icon = TYPE_ICONS[sheet.columnConfig?.[header]?.type || 'text'];
                                return (
                                <TableHead key={header}>
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                            <span>{header}</span>
                                        </div>
                                        {permissions.canEdit && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => setColumnToConfigure(header)}>
                                                        <Settings className="mr-2 h-4 w-4"/>
                                                        Configure Column
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        className="text-destructive focus:text-destructive"
                                                        onSelect={() => setColumnToDelete(header)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Column
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </TableHead>
                            )})}
                            <TableHead className="w-[50px] sticky right-0 bg-background/95 backdrop-blur">
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={headers.length + 1} className="h-24 text-center">
                                    No rows yet. Click "Add Row" to start.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {headers.map(header => {
                                        const columnConfig = sheet.columnConfig?.[header];
                                        return (
                                        <TableCell 
                                            key={`${rowIndex}-${header}`}
                                            onDoubleClick={() => permissions.canEdit && setEditingCell({ rowIndex, header })}
                                            className={permissions.canEdit ? 'cursor-cell' : ''}
                                        >
                                            {editingCell?.rowIndex === rowIndex && editingCell?.header === header ? (
                                                <>
                                                    {columnConfig?.type === 'select' && columnConfig.selectOptions ? (
                                                        <Select
                                                            value={row[header] || ''}
                                                            onValueChange={(value) => {
                                                                handleCellUpdate(rowIndex, header, value);
                                                                const newData = [...data];
                                                                newData[rowIndex][header] = value;
                                                                saveChanges({ data: newData }, 'Cell updated.');
                                                                setEditingCell(null);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 -mx-2 -my-1">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {columnConfig.selectOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : columnConfig?.type === 'date' ? (
                                                         <Popover open={true} onOpenChange={() => setEditingCell(null)}>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="outline" className="h-8 -mx-2 -my-1 w-full justify-start text-left font-normal">
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {row[header] ? format(new Date(row[header]), 'PPP') : <span>Pick a date</span>}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={row[header] ? new Date(row[header]) : undefined}
                                                                    onSelect={(date) => {
                                                                        const isoDate = date?.toISOString();
                                                                        handleCellUpdate(rowIndex, header, isoDate);
                                                                        const newData = [...data];
                                                                        newData[rowIndex][header] = isoDate;
                                                                        saveChanges({ data: newData }, 'Cell updated.');
                                                                        setEditingCell(null);
                                                                    }}
                                                                    initialFocus
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    ) : (
                                                        <Input
                                                            autoFocus
                                                            value={row[header] || ''}
                                                            onChange={(e) => handleCellUpdate(rowIndex, header, e.target.value)}
                                                            onBlur={handleBlurSave}
                                                            onKeyDown={handleEnterSave}
                                                            className="h-8"
                                                            type={columnConfig?.type === 'number' ? 'number' : 'text'}
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <span className="block min-h-[2rem] py-2 truncate">
                                                    {columnConfig?.type === 'date' && row[header]
                                                        ? format(new Date(row[header]), 'PPP')
                                                        : row[header]}
                                                </span>
                                            )}
                                        </TableCell>
                                    )})}
                                    <TableCell className="sticky right-0 bg-background/95 backdrop-blur">
                                        {permissions.canEdit && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action will permanently delete this row.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteRow(rowIndex)} className="bg-destructive hover:bg-destructive/90">
                                                            Delete Row
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
             <div className="flex-shrink-0 border-t p-2 flex items-center gap-2">
                {permissions.canEdit && (
                    <>
                         <Button variant="outline" size="sm" onClick={handleAddRow}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Row
                        </Button>
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
