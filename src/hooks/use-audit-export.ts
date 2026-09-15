'use client';

import { useState } from 'react';

export function useAuditExport(projectId: string) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportAuditData = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/export?format=json`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to export audit data');
      }

      // Convert to blob and trigger download
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-export-${projectId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err: any) {
      setError(err.message || 'An error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  };

  return { exportAuditData, isExporting, error };
}