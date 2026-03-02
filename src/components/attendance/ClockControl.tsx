"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { format } from 'date-fns';
import { Clock } from "lucide-react";

export function ClockControl() {
    const today = new Date();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Time Clock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                <Button
                    size="lg"
                    className="w-full h-12 text-lg"
                    disabled={true}
                >
                    <Clock className="mr-2" /> Clock In / Out (Disabled)
                </Button>
                 <p className="text-xs text-muted-foreground">{format(today, 'PPPP')}</p>
            </CardContent>
        </Card>
    );
}
