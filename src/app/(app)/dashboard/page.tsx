'use client';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import Link from 'next/link';

export default function DashboardMovedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Info className="h-12 w-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">This page has moved</h1>
        <p className="mt-2 text-muted-foreground">The dashboard is now called "Overview".</p>
        <Button asChild className="mt-6">
            <Link href="/overview">Go to Overview</Link>
        </Button>
    </div>
  );
}
