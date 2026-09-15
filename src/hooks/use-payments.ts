'use client';

import { useState, useEffect, useCallback } from 'react';

export type PaymentStatus = 'pending' | 'reconciled' | 'disputed' | 'failed';

export type Payment = {
  id?: string;
  awardId: string;
  projectId: string;
  assessedAmount: number | null;
  paidAmount: number | null;
  externalReference: string | null;
  paymentStatus: PaymentStatus;
  createdAt?: string;
  updatedAt?: string;
};

export function usePayments(projectId: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/payments`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      const json = await res.json();
      setPayments(json.data ?? []);
    } catch {
      setError('Failed to load payments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return { payments, isLoading, error, refresh: fetchPayments };
}