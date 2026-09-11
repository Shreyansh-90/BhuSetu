import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { documents, documentVersions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function listDocuments(
  request: NextRequest,
  { logger, params }: ApiHandlerContext
) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  
  const authzError = requireMinimumRole(authResult.user, 'viewer');
  if (authzError) return authzError;

  const projectId = params?.projectId as string;

  try {
    // Fetch documents
    const docs = await db.select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.updatedAt));

    // For each document, fetch the latest version
    // (In a real app, you might do this with a join or a lateral join for performance, 
    // but here we just do a separate query or a simple mapped query since it's a slice)
    const docIds = docs.map(d => d.id);
    
    let versions: any[] = [];
    if (docIds.length > 0) {
      // Basic grouping approach
      const allVersions = await db.select()
        .from(documentVersions); // We should filter by documentId in docIds
        // Drizzle doesn't have a simple IN clause out of the box without `inArray`, let's just use `inArray`
    }
    
    // We will use a more standard Drizzle join approach if possible, but let's just do an N+1 for simplicity in this slice 
    // or use `inArray`
    const { inArray } = await import('drizzle-orm');
    
    if (docIds.length > 0) {
      versions = await db.select()
        .from(documentVersions)
        .where(inArray(documentVersions.documentId, docIds))
        .orderBy(desc(documentVersions.versionNumber));
    }

    const responseData = docs.map(doc => {
      const docVersions = versions.filter(v => v.documentId === doc.id);
      return {
        ...doc,
        latestVersion: docVersions[0] || null,
        versions: docVersions,
      };
    });

    return successResponse(responseData);
  } catch (err) {
    logger.error('Failed to list documents', { error: err });
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch documents.');
  }
}

export const GET = apiHandler(listDocuments);
