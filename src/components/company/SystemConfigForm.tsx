"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { SystemConfig } from "@/lib/types";

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const configFormSchema = z.object({
  finance_access: z.boolean(),
  admin_tools: z.boolean(),
  attendance_strict: z.boolean(),
  chat_enabled: z.boolean(),
  allow_self_edit: z.boolean(),
  currency_symbol: z.string().max(3, "Max 3 chars"),
  branding_color: z.string().refine((val) => val === "" || hexColorRegex.test(val), {
    message: "Must be a valid hex color (e.g., #RRGGBB) or empty.",
  }).optional().nullable(),
  work_hours: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  office_coordinates: z.object({
    lat: z.coerce.number().optional().nullable(),
    lng: z.coerce.number().optional().nullable(),
  }).optional().nullable(),
});

type FormData = z.infer<typeof configFormSchema>;

interface SystemConfigFormProps {
  systemConfig: SystemConfig;
}

export function SystemConfigForm({ systemConfig }: SystemConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      finance_access: systemConfig.finance_access,
      admin_tools: systemConfig.admin_tools,
      attendance_strict: systemConfig.attendance_strict,
      chat_enabled: systemConfig.chat_enabled,
      allow_self_edit: systemConfig.allow_self_edit,
      currency_symbol: systemConfig.currency_symbol,
      branding_color: systemConfig.branding_color || "",
      work_hours: {
        start: systemConfig.work_hours?.start || "",
        end: systemConfig.work_hours?.end || "",
      },
      office_coordinates: {
        lat: systemConfig.office_coordinates?.lat,
        lng: systemConfig.office_coordinates?.lng,
      },
    },
  });

  async function onSubmit(values: FormData) {
    setIsLoading(true);

    // Prepare data for Firestore update
    const updateData = {
      ...values,
      branding_color: values.branding_color || null,
      office_coordinates: (values.office_coordinates?.lat != null && values.office_coordinates?.lng != null) 
          ? values.office_coordinates 
          : null,
      work_hours: (values.work_hours?.start && values.work_hours?.end) 
          ? values.work_hours
          : null,
    };

    try {
      const configRef = doc(firestore, "system_configs", systemConfig.id);
      updateDocumentNonBlocking(configRef, updateData);
      toast({
        title: "Configuration Saved",
        description: "Your organization's settings have been updated.",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
            <h3 className="text-md font-medium">Feature Toggles</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                 <FormField
                    control={form.control}
                    name="finance_access"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Requisitions</FormLabel>
                                <FormDescription className="text-xs">Enable finance module.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="admin_tools"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Admin Tools</FormLabel>
                                <FormDescription className="text-xs">Allow managers access to Team page.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                 />
                <FormField
                    control={form.control}
                    name="chat_enabled"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Chat</FormLabel>
                                <FormDescription className="text-xs">Enable internal messaging.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="allow_self_edit"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Self Profile Edit</FormLabel>
                                <FormDescription className="text-xs">Allow staff to edit their profile.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                 />
            </div>
        </div>
        <div className="space-y-4">
             <h3 className="text-md font-medium">Operational Settings</h3>
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="currency_symbol"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Currency Symbol</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="branding_color"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Branding Color</FormLabel>
                            <div className="flex items-center gap-2">
                                <Controller
                                    control={form.control}
                                    name="branding_color"
                                    render={({ field: controllerField }) => (
                                        <Input 
                                            type="color" 
                                            className="w-12 h-10 p-1"
                                            value={controllerField.value || "#000000"}
                                            onChange={e => controllerField.onChange(e.target.value)}
                                        />
                                    )}
                                />
                                <FormControl><Input {...field} placeholder="#FFFFFF" /></FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
        </div>

        <div className="space-y-4">
            <h3 className="text-md font-medium">Attendance & Location</h3>
            <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="attendance_strict"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Attendance Strict Mode</FormLabel>
                                <FormDescription className="text-xs">Enforce Geofencing for clock-ins.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                    />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="work_hours.start"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Work Hours Start</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="work_hours.end"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Work Hours End</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="office_coordinates.lat"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Office Latitude</FormLabel>
                                <FormControl><Input type="number" step="any" placeholder="e.g. 34.0522" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="office_coordinates.lng"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Office Longitude</FormLabel>
                                <FormControl><Input type="number" step="any" placeholder="e.g. -118.2437" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Configuration
        </Button>
      </form>
    </Form>
  );
}
