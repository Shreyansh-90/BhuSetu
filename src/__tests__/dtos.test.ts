import { describe, it, expect } from 'vitest';
import { CreatePossessionRequestSchema } from '@/lib/dtos/possession';
import { ProjectKpiResponseSchema } from '@/lib/dtos/dashboard';

describe('DTO Contract Tests', () => {
  describe('CreatePossessionRequestSchema', () => {
    it('should validate a correct payload', () => {
      const validPayload = {
        parcelId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'handed_over',
        possessionDate: '2026-09-15',
        remarks: 'All clear',
        documents: ['https://example.com/doc1.pdf']
      };

      const result = CreatePossessionRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUIDs for parcelId', () => {
      const invalidPayload = {
        parcelId: 'not-a-uuid',
        status: 'handed_over',
      };

      const result = CreatePossessionRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid UUID');
      }
    });

    it('should reject invalid status strings', () => {
      const invalidPayload = {
        status: 'invalid_status',
      };

      const result = CreatePossessionRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('ProjectKpiResponseSchema', () => {
    it('should reject negative integers for counts', () => {
      const invalidPayload = {
        totalParcels: -5,
        totalAreaAcquired: 100,
        totalCompensationAssessed: 100,
        totalCompensationPaid: 100,
        totalAffectedFamilies: 10,
        familiesRehabilitated: 10,
        possessionStatus: 'Pending',
        lastCalculatedAt: new Date().toISOString()
      };

      const result = ProjectKpiResponseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Too small');
      }
    });
  });
});