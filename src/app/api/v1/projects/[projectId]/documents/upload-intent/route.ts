import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { validateRequest } from '@/lib/api/validation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { documents, documentVersions, auditEvents } from '@/lib/db/schema';
import { createDocumentIntentDto } from '@/lib/dtos/documents';
import { generateUploadUrl } from '@/lib/storage/minio';
import { extractClientIp } from '@/lib/api/utils';

async function createUploadIntent(
  request: NextRequest,
  { logger, params }: ApiHandlerContext
) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;
  
  // Need permission to upload (e.g. project_manager or field_officer)
  const authzError = requireMinimumRole(user, 'field_officer');
  if (authzError) return authzError;

  const validReq = await validateRequest(request, { body: createDocumentIntentDto });
  if (!validReq.success) return validReq.response;
  const { body } = validReq.data;
  const projectId = params?.projectId as string;

  try {
    const result = await db.transaction(async (tx) => {
      // Create document record
      const [doc] = await tx.insert(documents).values({
        projectId,
        classification: body.classification,
        status: 'initiated',
      }).returning();

      // Create version record
      const objectKey = `projects/${projectId}/documents/${doc.id}/v1`;
      
      const [version] = await tx.insert(documentVersions).values({
        documentId: doc.id,
        versionNumber: 1,
        filename: body.filename,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        minioObjectKey: objectKey,
        uploadedBy: user.id,
      }).returning();

      await tx.insert(auditEvents).values({
        eventType: 'document_upload_initiated',
        entityType: 'document',
        entityId: doc.id,
        actorId: user.id,
        actorRole: user.role,
        actorIp: extractClientIp(request),
        newValues: { documentId: doc.id, version: 1, filename: body.filename },
      });

      return { doc, version, objectKey };
    });

    const uploadUrl = await generateUploadUrl(result.objectKey, body.mimeType);

    return successResponse({
      documentId: result.doc.id,
      versionId: result.version.id,
      uploadUrl,
    });
  } catch (err) {
    logger.error('Failed to create upload intent', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to initiate upload.');
  }
}

export const POST = apiHandler(createUploadIntent);
