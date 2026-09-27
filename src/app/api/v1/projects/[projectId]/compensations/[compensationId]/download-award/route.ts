import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { compensations, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { minioClient } from '@/lib/storage/minio';
import fs from 'fs';
import path from 'path';

async function downloadAward(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const projectId = params?.projectId as string;
  const compensationId = params?.compensationId as string;

  if (!projectId || !compensationId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID and Compensation ID are required.');
  }

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return errorResponse('NOT_FOUND', 'Project not found.');

  // Access check
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (!user.stateCode || project.stateCode !== user.stateCode) return errorResponse('FORBIDDEN', 'Access denied.');
    if (user.role !== 'state_officer') {
      if (!user.districtCode || project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN', 'Access denied.');
    }
  }

  const compensation = await db.query.compensations.findFirst({
    where: and(eq(compensations.id, compensationId), eq(compensations.projectId, projectId))
  });

  if (!compensation || !compensation.awardDocumentHash) {
    return errorResponse('NOT_FOUND', 'Award document not found.');
  }

  const fileName = `award-${projectId}-${compensation.parcelId}.pdf`;
  const bucketName = 'bhushetu-awards';

  try {
    if (minioClient) {
      const presignedUrl = await minioClient.presignedGetObject(bucketName, fileName, 24 * 60 * 60);
      return successResponse({ url: presignedUrl, fileName });
    } else {
      // Local fallback
      const localFilePath = path.join(process.cwd(), 'awards', fileName);
      if (fs.existsSync(localFilePath)) {
        // Read file and send base64 data URI for simplicity in the mock
        const fileBuffer = fs.readFileSync(localFilePath);
        const b64 = fileBuffer.toString('base64');
        return successResponse({ url: `data:application/pdf;base64,${b64}`, fileName });
      } else {
        return errorResponse('NOT_FOUND', 'File not found on local disk.');
      }
    }
  } catch (err) {
    logger.error('Failed to download award', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve the document.');
  }
}

export const GET = apiHandler(downloadAward);
