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
        baseAmount: data.baseAmount ?? null,
        solatiumAmount: data.solatiumAmount ?? null,
        multiplierUsed: data.multiplierUsed ?? 1.0,
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

  /**
   * Batch create awards (useful for generating drafts from map intersections)
   */
  static async createAwardsBatch(projectId: string, dataList: CreateAwardRequest[]): Promise<AwardResponse[]> {
    if (dataList.length === 0) return [];
    
    const values = dataList.map(data => ({
      projectId: projectId,
      parcelId: data.parcelId,
      baseAmount: data.baseAmount ?? null,
      solatiumAmount: data.solatiumAmount ?? null,
      multiplierUsed: data.multiplierUsed ?? 1.0,
      assessedAmount: data.assessedAmount ?? null,
      awardDate: data.awardDate ?? null,
      status: data.status ?? 'draft',
    }));

    const results = await db
      .insert(awards)
      .values(values)
      .returning();

    return results.map(created => ({
      ...created,
      awardDate: created.awardDate ? created.awardDate : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    }));
  }
}
