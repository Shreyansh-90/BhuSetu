import 'server-only';
import { db } from '../db';
import { awards } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { AwardResponse, CreateAwardRequest } from '../dtos/awards';

export class AwardService {
  /**
   * Fetch all awards for a specific project
   */
  static async getAwardsForProject(projectId: string): Promise<AwardResponse[]> {
    const results = await db
      .select()
      .from(awards)
      .where(eq(awards.projectId, projectId))
      .orderBy(desc(awards.createdAt));
      
    return results.map(a => ({
      ...a,
      awardDate: a.awardDate ? a.awardDate : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  /**
   * Create a new award assessment
   */
  static async createAward(projectId: string, data: CreateAwardRequest): Promise<AwardResponse> {
    const result = await db
      .insert(awards)
      .values({
        projectId: projectId,
        parcelId: data.parcelId,
        assessedAmount: data.assessedAmount ?? null,
        awardDate: data.awardDate ?? null,
        status: data.status ?? 'draft',
      })
      .returning();

    const created = result[0];
    return {
      ...created,
      awardDate: created.awardDate ? created.awardDate : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }
}
