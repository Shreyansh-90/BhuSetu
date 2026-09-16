import { useState, useEffect } from 'react';

export type DashboardMetrics = {
  activeProjects: number;
  pendingTasks: number;
  unreadNotifications: number;
};

export function useMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeProjects: 0,
    pendingTasks: 0,
    unreadNotifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/v1/metrics/dashboard');
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const json = await res.json();
        if (json.success && json.data) {
          setMetrics(json.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    // In a real app we might poll this or use WebSockets, but fetch once on mount is fine for now.
  }, []);

  return { metrics, loading, error };
}
