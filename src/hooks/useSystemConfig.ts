'use client';
import { useMemo, useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { SystemConfig, UserProfile } from '@/lib/types';

export function useSystemConfig(userProfile: UserProfile | null) {
  const firestore = useFirestore();
  const [isCreating, setIsCreating] = useState(false);

  const configQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.orgId) return null;
    return query(
      collection(firestore, 'system_configs'),
      where('orgId', '==', userProfile.orgId),
      limit(1)
    );
  }, [firestore, userProfile?.orgId]);

  const { data: configData, isLoading: isCollectionLoading } = useCollection<SystemConfig>(configQuery);

  useEffect(() => {
    if (!isCollectionLoading && (!configData || configData.length === 0) && userProfile?.orgId && !isCreating) {
      setIsCreating(true);
      
      const configCollection = collection(firestore, "system_configs");
      const defaultConfig: Omit<SystemConfig, 'id'> = {
          orgId: userProfile.orgId,
          finance_access: true,
          admin_tools: true,
          attendance_strict: false,
          chat_enabled: true,
          allow_self_edit: true,
          office_coordinates: null,
          work_hours: { start: '09:00', end: '17:00' },
          currency_symbol: '$',
          branding_color: null,
      };
      
      addDocumentNonBlocking(configCollection, defaultConfig).finally(() => {
          setIsCreating(false);
      });
    }
  }, [isCollectionLoading, configData, userProfile, firestore, isCreating]);

  const config = useMemo(() => (configData && configData.length > 0 ? configData[0] : null), [configData]);
  
  const isLoading = isCollectionLoading || isCreating;
  
  return { config, isLoading };
}
