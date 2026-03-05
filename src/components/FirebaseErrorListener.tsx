'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It displays a full-screen "Access Denied" overlay instead of crashing the app.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error("Firebase Permission Error Caught:", error.message);
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in-0 duration-300">
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-full mb-6">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold font-headline text-foreground">Access Denied</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          You do not have the required permissions to perform this action or view this data. This is likely a Firestore Security Rule issue.
        </p>

        <Button
          onClick={() => router.back()}
          className="mt-8"
          variant="outline"
        >
          Go Back to Previous Page
        </Button>
      </div>
    );
  }

  // This component renders nothing if there is no error.
  return null;
}
