'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProjectKpiResponse } from '@/lib/dtos/dashboard';

export function useDashboard(projectId: string) {
  const [kpis, setKpis] = useState<ProjectKpiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKpis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/dashboard`);
      if (!res.ok) {
        if (res.status === 403) throw new Error('Unauthorized to view dashboard.');
        throw new Error('Failed to fetch dashboard metrics');
      }
      const json = await res.json();
      setKpis(json.data ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  return { kpis, isLoading, error, refresh: fetchKpis };
}