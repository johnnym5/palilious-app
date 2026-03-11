'use client';

import { collection, Firestore } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { ErrorLog, UserProfile } from './types';

export function logErrorToFirestore(
  firestore: Firestore,
  error: Error & { digest?: string },
  errorInfo?: { componentStack?: string | null },
  userProfile?: UserProfile | null
) {
  try {
    const errorLog: Omit<ErrorLog, 'id'> = {
      errorMessage: error.message,
      stackTrace: error.stack || error.digest || 'No stack trace available',
      componentStack: errorInfo?.componentStack || 'No component stack available',
      timestamp: new Date().toISOString(),
      path: typeof window !== 'undefined' ? window.location.pathname : 'N/A',
      userId: userProfile?.id,
      userName: userProfile?.fullName,
      orgId: userProfile?.orgId,
    };

    // This is a fire-and-forget operation
    addDocumentNonBlocking(collection(firestore, 'error_logs'), errorLog);
  } catch (loggingError) {
    console.error("--- FAILED TO LOG ERROR TO FIRESTORE ---");
    console.error("Original Error:", error);
    console.error("Logging Error:", loggingError);
    console.error("-----------------------------------------");
  }
}
