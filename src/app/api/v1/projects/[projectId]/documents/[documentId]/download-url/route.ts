import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string, documentId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult.success) return authResult.response;

    const resolvedParams = await params;
    
    return successResponse({
      downloadUrl: `https://example.com/mock-download/${resolvedParams.documentId}`
    });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message);
  }
}
