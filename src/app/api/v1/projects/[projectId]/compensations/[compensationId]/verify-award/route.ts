import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { compensations, projects, auditEvents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { extractClientIp } from '@/lib/api/utils';

async function verifyAwardDocument(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const projectId = params?.projectId as string;
  const compensationId = params?.compensationId as string;

  if (!projectId || !compensationId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID and Compensation ID are required.');
  }

  // 1. Fetch Compensation and Project to check access
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return errorResponse('NOT_FOUND', 'Project not found.');

  // Check RBAC/Multitenancy scope
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (user.stateCode && project.stateCode !== user.stateCode) return errorResponse('FORBIDDEN', 'Access denied.');
    if (user.districtCode && project.districtCode !== user.districtCode) return errorResponse('FORBIDDEN', 'Access denied.');
  }

  const compensation = await db.query.compensations.findFirst({
    where: and(eq(compensations.id, compensationId), eq(compensations.projectId, projectId))
  });

  if (!compensation) return errorResponse('NOT_FOUND', 'Compensation record not found.');
  if (!compensation.awardDocumentHash) return errorResponse('CONFLICT', 'No award hash is stored for this compensation. Award may not be generated yet.');

  // 2. Extract uploaded document
  let fileBuffer: Buffer;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return errorResponse('VALIDATION_ERROR', 'A file is required for verification.');
    }
    
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    return errorResponse('VALIDATION_ERROR', 'Failed to parse form data.');
  }

  // 3. Calculate SHA-256 Hash of uploaded bytes
  const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // 4. Compare and verify
  const isValid = calculatedHash === compensation.awardDocumentHash;

  // 5. Log audit event for verification attempt
  await db.insert(auditEvents).values({
    eventType: 'document_verification_attempted',
    entityType: 'compensation',
    entityId: compensation.id,
    actorId: user.id,
    actorRole: user.role,
    actorIp: extractClientIp(request),
    newValues: { isValid, calculatedHash },
    metadata: { note: 'Tamper detection check executed' }
  });

  if (isValid) {
    return successResponse({ verified: true, message: 'Document integrity confirmed. SHA-256 hash matches the authoritative database record.' });
  } else {
    return successResponse({ verified: false, message: 'TAMPER DETECTED. The uploaded document does not match the authoritative hash.' });
  }
}

export const POST = apiHandler(verifyAwardDocument);
