import { db } from '../db';
import { parcels, awards, payments, affectedFamilies, possessionRecords } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import type { ProjectKpiResponse } from '../dtos/dashboard';

export class DashboardService {
  /**
   * Generates high-level KPIs for a specific project by running aggregate queries.
   * This strictly separates analytics reads from transactional queries and redacts sensitive data.
   */
  static async getProjectKpis(projectId: string): Promise<ProjectKpiResponse> {
    // Note: In a production Drizzle setup, these could be executed in a single Promise.all
    // or as a complex joined aggregated query. For simplicity and clarity in this slice,
    // we perform separate lightweight aggregate queries.

    // 1. Parcels & Area
    const parcelStats = await db
      .select({
        count: sql<number>`count(*)`,
        totalArea: sql<number>`sum(${parcels.areaSqm})`,
      })
      .from(parcels)
      .where(eq(parcels.projectId, projectId));

    const totalParcels = Number(parcelStats[0]?.count || 0);
    const totalAreaAcquired = Number(parcelStats[0]?.totalArea || 0);

    // 2. Awards (Assessed Compensation)
    const awardStats = await db
      .select({
        totalAssessed: sql<number>`sum(${awards.assessedAmount})`,
      })
      .from(awards)
      .where(eq(awards.projectId, projectId));

    const totalCompensationAssessed = Number(awardStats[0]?.totalAssessed || 0);

    // 3. Payments (Paid Compensation)
    const paymentStats = await db
      .select({
        totalPaid: sql<number>`sum(${payments.paidAmount})`,
      })
      .from(payments)
      .where(eq(payments.projectId, projectId));

    const totalCompensationPaid = Number(paymentStats[0]?.totalPaid || 0);

    // 4. Affected Families & R&R
    const familyStats = await db
      .select({
        total: sql<number>`count(*)`,
        rehabilitated: sql<number>`count(*) filter (where ${affectedFamilies.status} = 'provided')`,
      })
      .from(affectedFamilies)
      .where(eq(affectedFamilies.projectId, projectId));

    const totalAffectedFamilies = Number(familyStats[0]?.total || 0);
    const familiesRehabilitated = Number(familyStats[0]?.rehabilitated || 0);

    // 5. Possession Status
    const possessionStats = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(possessionRecords)
      .where(eq(possessionRecords.projectId, projectId));

    const posCount = Number(possessionStats[0]?.count || 0);
    
    // Determine a string description for possession status
    let possessionStatus = 'Pending';
    if (posCount > 0 && totalParcels > 0 && posCount >= totalParcels) {
      possessionStatus = 'Handed Over (Complete)';
    } else if (posCount > 0) {
      possessionStatus = `In Progress (${posCount}/${totalParcels} Parcels)`;
    } else if (totalParcels === 0) {
      possessionStatus = 'No Parcels';
    }

    return {
      totalParcels,
      totalAreaAcquired,
      totalCompensationAssessed,
      totalCompensationPaid,
      totalAffectedFamilies,
      familiesRehabilitated,
      possessionStatus,
      lastCalculatedAt: new Date().toISOString(),
    };
  }
}