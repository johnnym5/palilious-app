"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarIcon } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput, cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";

interface EditRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: Sheet;
  rowData: Record<string, any>;
  onSave: (updatedData: Record<string, any>) => void;
}

export function EditRowDialog({ open, onOpenChange, sheet, rowData, onSave }: EditRowDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = useMemo(() => {
    const schemaShape: Record<string, z.ZodType<any, any>> = {};
    sheet.headers.forEach(header => {
        const config = sheet.columnConfig?.[header];
        switch (config?.type) {
            case 'number':
                schemaShape[header] = z.coerce.number();
                break;
            case 'date':
                schemaShape[header] = z.any().optional(); // Accept string or date
                break;
            default:
                schemaShape[header] = z.string().optional();
        }
    });
    return z.object(schemaShape);
  }, [sheet.headers, sheet.columnConfig]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (rowData) {
        const initialValues: Record<string, any> = {};
        for(const header of sheet.headers) {
            const config = sheet.columnConfig?.[header];
            if (config?.type === 'date' && rowData[header]) {
                initialValues[header] = new Date(rowData[header]);
            } else {
                initialValues[header] = rowData[header] ?? '';
            }
        }
        form.reset(initialValues);
    }
  }, [rowData, sheet, form]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
    }
    onOpenChange(isOpen);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const updatedRow = Object.entries(values).reduce((acc, [key, value]) => {
        const config = sheet.columnConfig?.[key];
        if (config?.type === 'date' && value instanceof Date) {
            acc[key] = value.toISOString();
        } else if (typeof value === 'string') {
            acc[key] = sanitizeInput(value);
        } else {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, any>);

    onSave(updatedRow);
    setIsLoading(false);
    handleOpenChange(false);
  }

  const renderFormControl = (header: string, field: any) => {
    const config = sheet.columnConfig?.[header];
    switch(config?.type) {
        case 'number':
            return <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />;
        case 'select':
            return (
                <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                    <SelectContent>
                        {config.selectOptions?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                </Select>
            );
        case 'date':
             return (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                </Popover>
            );
        case 'text':
        default:
            return <Input {...field} />;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Row</DialogTitle>
          <DialogDescription>
            Update the details for this entry.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                {sheet.headers.map(header => (
                     <FormField
                        key={header}
                        control={form.control}
                        name={header}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{header}</FormLabel>
                            <FormControl>{renderFormControl(header, field)}</FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                ))}
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
