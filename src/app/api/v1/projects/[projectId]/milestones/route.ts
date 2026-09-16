import { getAuthenticatedUser } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { milestones } from '@/lib/db/schema';
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
    const projectMilestones = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, resolvedParams.projectId))
      .orderBy(desc(milestones.createdAt));
      
    return successResponse(projectMilestones);
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message);
  }
}
