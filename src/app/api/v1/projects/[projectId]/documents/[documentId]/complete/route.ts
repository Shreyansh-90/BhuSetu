import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { documents, documentVersions, auditEvents } from '@/lib/db/schema';
import { verifyObject } from '@/lib/storage/minio';
import { extractClientIp } from '@/lib/api/utils';
import { eq, desc, and } from 'drizzle-orm';

async function completeUpload(
  request: NextRequest,
  { logger, params }: ApiHandlerContext
) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const authzError = requireMinimumRole(user, 'field_officer');
  if (authzError) return authzError;

  const projectId = params?.projectId as string;
  const documentId = params?.documentId as string;

  try {
    // Get the document and its latest version (which is expected to be 'initiated')
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc || doc.projectId !== projectId) {
      return errorResponse('NOT_FOUND', 'Document not found.');
    }

    if (doc.status !== 'initiated') {
      return errorResponse('CONFLICT', 'Document is not in initiated state.');
    }

    const version = await db.query.documentVersions.findFirst({
      where: eq(documentVersions.documentId, documentId),
      orderBy: [desc(documentVersions.versionNumber)],
    });

    if (!version) {
      return errorResponse('INTERNAL_ERROR', 'Document version not found.');
    }

    // Verify the object exists in MinIO and get its size and etag
    try {
      const minioStat = await verifyObject(version.minioObjectKey);
      
      // We could optionally check if size matches, but for now just updating
      await db.transaction(async (tx) => {
        await tx.update(documentVersions)
          .set({ contentHash: minioStat.etag, sizeBytes: minioStat.size })
          .where(eq(documentVersions.id, version.id));

        await tx.update(documents)
          .set({ status: 'uploaded', updatedAt: new Date() })
          .where(eq(documents.id, documentId));

        await tx.insert(auditEvents).values({
          eventType: 'document_uploaded',
          entityType: 'document',
          entityId: documentId,
          actorId: user.id,
          actorRole: user.role,
          actorIp: extractClientIp(request),
          newValues: { status: 'uploaded', etag: minioStat.etag },
        });
      });

      return successResponse({ message: 'Upload completed and verified' });
    } catch (minioErr) {
      logger.error('MinIO verification failed', { error: minioErr });
      return errorResponse('VALIDATION_ERROR', 'File could not be verified in storage. Did the upload succeed?');
    }
  } catch (err) {
    logger.error('Failed to complete upload', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to complete upload.');
  }
}

export const POST = apiHandler(completeUpload);
