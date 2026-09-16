import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

async function getMe(request: NextRequest, { logger }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const rows = await db.select().from(userProfiles).where(eq(userProfiles.id, user.id));
  if (rows.length === 0) return errorResponse('NOT_FOUND', 'User profile not found');

  return successResponse(rows[0]);
}

const patchSchema = z.object({
  fullName: z.string().min(1).optional(),
});

async function updateMe(request: NextRequest, { logger }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  let body;
  try { body = await request.json(); } catch { return errorResponse('VALIDATION_ERROR', 'Invalid JSON'); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Invalid payload');

  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName) updates.fullName = parsed.data.fullName;

  if (Object.keys(updates).length === 0) {
    return errorResponse('VALIDATION_ERROR', 'No valid fields to update');
  }

  await db.update(userProfiles)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(userProfiles.id, user.id));

  // Fetch and return the updated profile
  const updated = await db.select().from(userProfiles).where(eq(userProfiles.id, user.id));
  return successResponse(updated[0]);
}

export const GET = apiHandler(getMe);
export const PATCH = apiHandler(updateMe);
