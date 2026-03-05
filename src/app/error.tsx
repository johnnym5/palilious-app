
'use client';

import { Button } from '@/components/ui/button';
import { ShieldAlert, RotateCw, RefreshCw, Undo } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background text-foreground flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-full mb-6">
            <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold font-headline text-foreground">Application Error</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
            An unexpected error occurred. This could be a temporary issue. Please try one of the recovery options below.
        </p>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
                onClick={() => window.history.back()}
                variant="outline"
            >
                <Undo className="mr-2 h-4 w-4" />
                Go Back
            </Button>
            <Button
                onClick={() => reset()}
                variant="outline"
            >
                <RotateCw className="mr-2 h-4 w-4" />
                Try Again
            </Button>
             <Button
                onClick={() => window.location.reload()}
                variant="destructive"
            >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
            </Button>
        </div>
    </div>
  );
}
