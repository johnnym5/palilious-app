'use client';

import { useState, useEffect } from 'react';
import type { Sheet } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface SheetDataTableProps {
  sheet: Sheet;
}

export function SheetDataTable({ sheet }: SheetDataTableProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [data, setData] = useState<Record<string, any>[]>(sheet.data);
    const [editingCell, setEditingCell] = useState<{ rowIndex: number; header: string } | null>(null);

    // Update local state if the sheet prop changes (e.g., user switches tabs)
    useEffect(() => {
        setData(sheet.data);
    }, [sheet]);

    const handleCellUpdate = (rowIndex: number, header: string, value: any) => {
        const newData = [...data];
        newData[rowIndex][header] = value;
        setData(newData);
    };

    const saveChanges = () => {
        if (!firestore) return;
        setEditingCell(null); // Exit editing mode
        const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
        updateDocumentNonBlocking(sheetRef, { data });
        toast({ title: 'Saved', description: 'Your changes have been saved to the sheet.' });
    };
    
    if (!data || data.length === 0) {
        return <p className="text-muted-foreground text-center py-8">This sheet is empty. You can start by importing data.</p>;
    }

    return (
        <ScrollArea className="h-[60vh] relative">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                    <TableRow>
                        {sheet.headers.map(header => (
                            <TableHead key={header}>{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {sheet.headers.map(header => (
                                <TableCell 
                                    key={`${rowIndex}-${header}`}
                                    onDoubleClick={() => setEditingCell({ rowIndex, header })}
                                    className="cursor-cell"
                                >
                                    {editingCell?.rowIndex === rowIndex && editingCell?.header === header ? (
                                        <Input
                                            autoFocus
                                            value={row[header] || ''}
                                            onChange={(e) => handleCellUpdate(rowIndex, header, e.target.value)}
                                            onBlur={saveChanges}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    saveChanges();
                                                } else if (e.key === 'Escape') {
                                                    setEditingCell(null);
                                                    setData(sheet.data);
                                                }
                                            }}
                                            className="h-8"
                                        />
                                    ) : (
                                        <span className="block min-h-[2rem] py-2">{row[header]}</span>
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}
