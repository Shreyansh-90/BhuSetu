import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { documents, documentVersions, auditEvents } from '@/lib/db/schema';
import { generateDownloadUrl } from '@/lib/storage/minio';
import { extractClientIp } from '@/lib/api/utils';
import { eq, desc } from 'drizzle-orm';

async function getDownloadUrl(
  request: NextRequest,
  { logger, params }: ApiHandlerContext
) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const authzError = requireMinimumRole(user, 'viewer');
  if (authzError) return authzError;

  const projectId = params?.projectId as string;
  const documentId = params?.documentId as string;

  try {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc || doc.projectId !== projectId) {
      return errorResponse('NOT_FOUND', 'Document not found.');
    }

    if (doc.status === 'initiated') {
      return errorResponse('VALIDATION_ERROR', 'Document is not yet uploaded.');
    }

    const version = await db.query.documentVersions.findFirst({
      where: eq(documentVersions.documentId, documentId),
      orderBy: [desc(documentVersions.versionNumber)],
    });

    if (!version) {
      return errorResponse('NOT_FOUND', 'Document version not found.');
    }

    const downloadUrl = await generateDownloadUrl(version.minioObjectKey, version.filename);

    // Audit the download action
    await db.insert(auditEvents).values({
      eventType: 'document_download_url_generated',
      entityType: 'document',
      entityId: documentId,
      actorId: user.id,
      actorRole: user.role,
      actorIp: extractClientIp(request),
      newValues: { version: version.versionNumber },
    });

    return successResponse({ downloadUrl });
  } catch (err) {
    logger.error('Failed to generate download URL', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to generate download URL.');
  }
}

export const GET = apiHandler(getDownloadUrl);
