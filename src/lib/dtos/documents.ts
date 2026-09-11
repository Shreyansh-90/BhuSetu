import { z } from 'zod';

export const documentClassificationSchema = z.enum([
  'notice',
  'map',
  'schedule',
  'report',
  'evidence',
  'other',
]);

export const documentStatusSchema = z.enum([
  'initiated',
  'uploaded',
  'verified',
  'rejected',
  'archived',
]);

export const createDocumentIntentDto = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().positive().max(50 * 1024 * 1024), // 50MB max
  classification: documentClassificationSchema,
});

export const completeDocumentDto = z.object({
  // No payload needed for basic completion, but we could add notes here
});

export type CreateDocumentIntentDto = z.infer<typeof createDocumentIntentDto>;
export type CompleteDocumentDto = z.infer<typeof completeDocumentDto>;

export interface DocumentVersionDto {
  id: string;
  versionNumber: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

export interface DocumentDto {
  id: string;
  projectId: string;
  classification: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  latestVersion?: DocumentVersionDto;
  versions?: DocumentVersionDto[];
}
