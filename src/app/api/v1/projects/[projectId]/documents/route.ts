import { getAuthenticatedUser } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { documents, documentVersions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.success) return authResult.response;

    const resolvedParams = await params;
    
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, resolvedParams.projectId))
      .orderBy(desc(documents.createdAt));
      
    const results = await Promise.all(docs.map(async (doc) => {
      const versions = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, doc.id))
        .orderBy(desc(documentVersions.versionNumber))
        .limit(1);
        
      return {
        ...doc,
        latestVersion: versions.length > 0 ? versions[0] : undefined
      };
    }));
      
    return successResponse(results);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message);
  }
}
