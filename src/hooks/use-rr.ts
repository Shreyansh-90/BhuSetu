'use client';

import { useState, useEffect, useCallback } from 'react';
import type { 
  FamilyResponse, 
  CreateFamilyRequest, 
  CreateEntitlementRequest 
} from '@/lib/dtos/rr-entitlements';

export function useRR(projectId: string) {
  const [families, setFamilies] = useState<FamilyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFamilies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/families`);
      if (!res.ok) {
        if (res.status === 403) throw new Error('Unauthorized to view R&R data.');
        throw new Error('Failed to fetch families');
      }
      const json = await res.json();
      setFamilies(json.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load R&R data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const createFamily = useCallback(
    async (payload: CreateFamilyRequest): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/families`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          return { success: false, error: json.error?.message ?? 'Failed to register family' };
        }
        await fetchFamilies();
        return { success: true };
      } catch {
        return { success: false, error: 'A network error occurred.' };
      }
    },
    [projectId, fetchFamilies]
  );

  const addEntitlement = useCallback(
    async (familyId: string, payload: CreateEntitlementRequest): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/families/${familyId}/entitlements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          return { success: false, error: json.error?.message ?? 'Failed to add entitlement' };
        }
        await fetchFamilies();
        return { success: true };
      } catch {
        return { success: false, error: 'A network error occurred.' };
      }
    },
    [projectId, fetchFamilies]
  );

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  return { families, isLoading, error, refresh: fetchFamilies, createFamily, addEntitlement };
}