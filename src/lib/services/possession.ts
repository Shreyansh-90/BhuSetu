import { db } from '../db';
import { possessionRecords } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { CreatePossessionRequest, UpdatePossessionRequest } from '../dtos/possession';

export class PossessionService {
  /**
   * Retrieves all possession records for a given project.
   */
  static async getPossessionRecords(projectId: string) {
    const records = await db
      .select()
      .from(possessionRecords)
      .where(eq(possessionRecords.projectId, projectId))
      .orderBy(desc(possessionRecords.createdAt));

    return records;
  }

  /**
   * Records a new possession/handover event.
   */
  static async recordPossession(projectId: string, data: CreatePossessionRequest) {
    const [record] = await db
      .insert(possessionRecords)
      .values({
        projectId,
        parcelId: data.parcelId ?? null,
        status: data.status,
        possessionDate: data.possessionDate ?? null,
        remarks: data.remarks ?? null,
        documents: data.documents ?? null,
      })
      .returning();
    
    return record;
  }

  /**
   * Updates an existing possession record.
   */
  static async updatePossession(recordId: string, data: UpdatePossessionRequest) {
    const [record] = await db
      .update(possessionRecords)
      .set({
        status: data.status,
        possessionDate: data.possessionDate,
        remarks: data.remarks,
        documents: data.documents,
        updatedAt: new Date(),
      })
      .where(eq(possessionRecords.id, recordId))
      .returning();
      
    return record;
  }
}