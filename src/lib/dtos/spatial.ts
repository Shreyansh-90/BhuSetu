import { z } from 'zod';

// ---------------------------------------------------------------------------
// Bounding-box query schema for viewport parcel queries
// ---------------------------------------------------------------------------

/**
 * Validates a comma-separated bbox string: "minLng,minLat,maxLng,maxLat"
 * Enforces WGS84 coordinate ranges and a max area guard of 25 sq degrees.
 */
export const bboxQuerySchema = z.object({
  bbox: z.string().transform((val, ctx) => {
    const parts = val.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'bbox must be 4 comma-separated numbers: minLng,minLat,maxLng,maxLat',
      });
      return z.NEVER;
    }
    const [minLng, minLat, maxLng, maxLat] = parts;

    // WGS84 range checks
    if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Coordinates must be within WGS84 range (lng: -180..180, lat: -90..90).',
      });
      return z.NEVER;
    }

    if (minLng >= maxLng || minLat >= maxLat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'min coordinates must be less than max coordinates.',
      });
      return z.NEVER;
    }

    // Max area guard: prevent full-country dumps
    const areaDeg = (maxLng - minLng) * (maxLat - minLat);
    if (areaDeg > 25) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bounding box too large. Maximum area is 25 square degrees.',
      });
      return z.NEVER;
    }

    return { minLng, minLat, maxLng, maxLat };
  }),
  zoom: z.coerce.number().int().min(1).max(22).default(12),
  parcelType: z.enum(['private', 'government', 'forest', 'tribal', 'other']).optional(),
  stateCode: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type BboxQueryDto = z.infer<typeof bboxQuerySchema>;

// ---------------------------------------------------------------------------
// Path parameter schemas
// ---------------------------------------------------------------------------

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid(),
});

export const parcelIdParamSchema = z.object({
  parcelId: z.string().uuid(),
});
