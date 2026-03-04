"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Sheet } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const formSchema = z.object({
  type: z.enum(["text", "number", "date", "select"]),
  selectOptions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ConfigureColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: Sheet;
  header: string;
}

export function ConfigureColumnDialog({ open, onOpenChange, sheet, header }: ConfigureColumnDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "text",
      selectOptions: "",
    },
  });

  useEffect(() => {
    if (sheet.columnConfig && sheet.columnConfig[header]) {
      const config = sheet.columnConfig[header];
      form.reset({
        type: config.type,
        selectOptions: config.selectOptions?.join(", ") || "",
      });
    } else {
        form.reset({ type: 'text', selectOptions: ''});
    }
  }, [sheet, header, form]);

  async function onSubmit(values: FormData) {
    if (!firestore) return;

    setIsLoading(true);

    const newConfig = {
      ...sheet.columnConfig,
      [header]: {
        type: values.type,
        selectOptions: values.type === 'select' ? values.selectOptions?.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      },
    };

    try {
      const sheetRef = doc(firestore, `workbooks/${sheet.workbookId}/sheets`, sheet.id);
      updateDocumentNonBlocking(sheetRef, { columnConfig: newConfig });
      toast({ title: "Column Updated", description: `Configuration for "${header}" has been saved.` });
      onOpenChange(false);
    } catch (error: any) {
      if (error.code !== 'permission-denied') {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const selectedType = form.watch("type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Column: {header}</DialogTitle>
          <DialogDescription>Set the data type and options for this column.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedType === "select" && (
              <FormField
                control={form.control}
                name="selectOptions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Options</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter options, separated by commas (e.g., Pending, In Progress, Done)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
