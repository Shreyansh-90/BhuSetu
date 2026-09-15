'use client';

import { useState, useEffect, useCallback } from 'react';

export type AwardStatus = 'draft' | 'assessed';

export type Award = {
  id: string;
  projectId: string;
  parcelId: string;
  assessedAmount: number | null;
  awardDate: string | null;
  status: AwardStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateAwardPayload = {
  parcelId: string;
  assessedAmount?: number;
  awardDate?: string;
  status?: AwardStatus;
};

export function useAwards(projectId: string) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAwards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/awards`);
      if (!res.ok) throw new Error('Failed to fetch awards');
      const json = await res.json();
      setAwards(json.data ?? []);
    } catch {
      setError('Failed to load awards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const createAward = useCallback(
    async (payload: CreateAwardPayload): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/awards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          return { success: false, error: json.error?.message ?? 'Failed to create award' };
        }
        await fetchAwards();
        return { success: true };
      } catch {
        return { success: false, error: 'A network error occurred.' };
      }
    },
    [projectId, fetchAwards]
  );

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  return { awards, isLoading, error, refresh: fetchAwards, createAward };
}
