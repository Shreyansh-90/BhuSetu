import { db } from '../db';
import { parcels, awards, affectedFamilies } from '../db/schema';
import { eq } from 'drizzle-orm';

export class AuditExportService {
  /**
   * Generates a redacted, flattened export of project data suitable for auditors.
   * This intentionally strips out personal identifiable information (PII) like names,
   * keeping only the metadata and statuses.
   */
  static async generateProjectExport(projectId: string) {
    const projectParcels = await db
      .select({
        id: parcels.id,
        surveyNumber: parcels.surveyNumber,
        village: parcels.village,
        district: parcels.district,
        parcelType: parcels.parcelType,
        areaSqm: parcels.areaSqm,
        
      })
      .from(parcels)
      .where(eq(parcels.projectId, projectId));

    const projectAwards = await db
      .select({
        id: awards.id,
        parcelId: awards.parcelId,
        assessedAmount: awards.assessedAmount,
        status: awards.status,
        awardDate: awards.awardDate,
      })
      .from(awards)
      .where(eq(awards.projectId, projectId));

    const projectFamilies = await db
      .select({
        id: affectedFamilies.id,
        familySize: affectedFamilies.familySize,
        category: affectedFamilies.category,
        status: affectedFamilies.status,
      })
      .from(affectedFamilies)
      .where(eq(affectedFamilies.projectId, projectId));

    return {
      projectId,
      exportedAt: new Date().toISOString(),
      disclaimer: "This document contains redacted audit information. Personal Identifiable Information (PII) such as names and exact bank references have been stripped.",
      data: {
        parcels: projectParcels,
        awards: projectAwards,
        families: projectFamilies,
      }
    };
  }
}