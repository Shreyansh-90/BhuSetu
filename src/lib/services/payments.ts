import 'server-only';
import { db } from '../db';
import { awards, payments } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { PaymentReconciliationResponse } from '../dtos/payments';

export class PaymentService {
  /**
   * Fetch all payment reconciliations for a specific project
   */
  static async getPaymentsForProject(projectId: string): Promise<PaymentReconciliationResponse[]> {
    const results = await db
      .select({
        awardId: awards.id,
        assessedAmount: awards.assessedAmount,
        paymentId: payments.id,
        paidAmount: payments.paidAmount,
        externalReference: payments.externalReference,
        paymentStatus: payments.status,
        paymentCreatedAt: payments.createdAt,
        paymentUpdatedAt: payments.updatedAt,
      })
      .from(awards)
      .leftJoin(payments, eq(awards.id, payments.awardId))
      .where(eq(awards.projectId, projectId))
      .orderBy(desc(awards.createdAt));

    return results.map((row) => ({
      id: row.paymentId ?? undefined,
      projectId: projectId,
      awardId: row.awardId,
      assessedAmount: row.assessedAmount ?? null,
      paidAmount: row.paidAmount ?? null,
      externalReference: row.externalReference ?? null,
      paymentStatus: row.paymentStatus ?? 'pending',
      createdAt: row.paymentCreatedAt?.toISOString(),
      updatedAt: row.paymentUpdatedAt?.toISOString(),
    }));
  }
}
