'use client';

import { useState, useEffect, useCallback } from 'react';
import type { 
  PossessionResponse, 
  CreatePossessionRequest 
} from '@/lib/dtos/possession';

export function usePossession(projectId: string) {
  const [records, setRecords] = useState<PossessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/possession`);
      if (!res.ok) {
        if (res.status === 403) throw new Error('Unauthorized to view possession data.');
        throw new Error('Failed to fetch possession records');
      }
      const json = await res.json();
      setRecords(json.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load possession data.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const recordPossession = useCallback(
    async (payload: CreatePossessionRequest): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/possession`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          return { success: false, error: json.error?.message ?? 'Failed to record handover' };
        }
        await fetchRecords();
        return { success: true };
      } catch {
        return { success: false, error: 'A network error occurred.' };
      }
    },
    [projectId, fetchRecords]
  );

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, isLoading, error, refresh: fetchRecords, recordPossession };
}