import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { minioClient } from '@/lib/storage/minio';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { extractClientIp } from '@/lib/api/utils';

async function uploadDocument(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;

  const projectId = params?.projectId as string;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required.');

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('type') as string || 'Notice';

    if (!file) {
      return errorResponse('VALIDATION_ERROR', 'File is required');
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${randomUUID()}-${file.name}`;
    const bucketName = 'bhushetu-documents';

    let fileUrl = '';

    if (minioClient) {
      // Ensure bucket exists (in prod, do this on startup, not here)
      const exists = await minioClient.bucketExists(bucketName).catch(() => false);
      if (!exists) {
        await minioClient.makeBucket(bucketName, 'us-east-1').catch(() => {});
      }

      await minioClient.putObject(bucketName, fileName, fileBuffer, file.size, {
        'Content-Type': file.type,
      });
      
      // Generate a presigned URL
      fileUrl = await minioClient.presignedGetObject(bucketName, fileName, 24 * 60 * 60);
    } else {
      // Mock upload for local demo without MinIO
      fileUrl = `https://mock-storage.bhushetu.gov.in/${bucketName}/${fileName}`;
    }

    const docRecord = {
      documentId: randomUUID(),
      fileName: file.name,
      documentType,
      url: fileUrl,
    };

    // Use auditEvents to persist document metadata without requiring a schema migration
    await db.insert(auditEvents).values({
      eventType: 'document_uploaded',
      entityType: 'project',
      entityId: projectId,
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      actorIp: extractClientIp(request),
      metadata: docRecord,
    });

    return successResponse({
      id: docRecord.documentId,
      projectId,
      ...docRecord,
      uploadedAt: new Date().toISOString(),
      uploadedBy: authResult.user.id
    }, undefined, 201);
  } catch (err) {
    logger.error('Failed to upload document', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to upload document to storage');
  }
}

async function listDocuments(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;

  const projectId = params?.projectId as string;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required.');

  const events = await db.query.auditEvents.findMany({
    where: and(eq(auditEvents.entityId, projectId), eq(auditEvents.eventType, 'document_uploaded')),
    orderBy: [desc(auditEvents.createdAt)]
  });

  const docs = events.map(e => ({
    id: (e.metadata as any)?.documentId,
    projectId,
    fileName: (e.metadata as any)?.fileName,
    documentType: (e.metadata as any)?.documentType,
    url: (e.metadata as any)?.url,
    uploadedAt: e.createdAt,
    uploadedBy: e.actorId,
  }));

  return successResponse(docs);
}

export const POST = apiHandler(uploadDocument);
export const GET = apiHandler(listDocuments);
