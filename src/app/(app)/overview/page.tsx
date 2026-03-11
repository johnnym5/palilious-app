'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OverviewRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Info className="h-12 w-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">This page has moved</h1>
        <p className="mt-2 text-muted-foreground">The main dashboard is now at the root of the site.</p>
        <div className="mt-6 flex items-center gap-4">
            <Loader2 className="animate-spin" />
            <p>Redirecting you...</p>
        </div>
        <Button asChild className="mt-6" variant="outline">
            <Link href="/">Go to Home</Link>
        </Button>
    </div>
  );
}
