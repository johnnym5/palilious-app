'use client';
import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { SystemConfig, UserProfile } from '@/lib/types';

export function useSystemConfig(userProfile: UserProfile | null) {
  const firestore = useFirestore();

  const configQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.orgId) return null;
    return query(
      collection(firestore, 'system_configs'),
      where('orgId', '==', userProfile.orgId),
      limit(1)
    );
  }, [firestore, userProfile?.orgId]);

  const { data: configData, isLoading } = useCollection<SystemConfig>(configQuery);

  const config = useMemo(() => (configData && configData.length > 0 ? configData[0] : null), [configData]);
  
  return { config, isLoading };
}
