import { db } from '../db';
import { affectedFamilies, rrEntitlements } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { CreateFamilyRequest, CreateEntitlementRequest, UpdateEntitlementRequest } from '../dtos/rr-entitlements';

export class RREntitlementsService {
  /**
   * Retrieves all affected families for a given project, along with their entitlements.
   */
  static async getFamiliesByProject(projectId: string) {
    const families = await db
      .select()
      .from(affectedFamilies)
      .where(eq(affectedFamilies.projectId, projectId))
      .orderBy(desc(affectedFamilies.createdAt));

    // Fetch entitlements for these families
    if (families.length === 0) return [];

    const familyIds = families.map((f: any) => f.id);
    // Note: Drizzle's 'inArray' should ideally be used for batching, 
    // but for simplicity we fetch all and filter or do N+1 if small. 
    // We'll fetch all entitlements for the project's families in one go if possible, 
    // or just iterate (which is fine for a hackathon MVP).
    
    const entitlementsData = await db
      .select()
      .from(rrEntitlements); // In a real app, filter by `inArray(familyId, familyIds)`

    const projectEntitlements = entitlementsData.filter((e: any) => familyIds.includes(e.familyId));

    return families.map((family: any) => ({
      ...family,
      entitlements: projectEntitlements.filter((e: any) => e.familyId === family.id),
    }));
  }

  /**
   * Registers a new affected family.
   */
  static async createFamily(projectId: string, data: CreateFamilyRequest) {
    const [family] = await db
      .insert(affectedFamilies)
      .values({
        projectId,
        parcelId: data.parcelId ?? null,
        headOfFamilyName: data.headOfFamilyName,
        familySize: data.familySize,
        category: data.category,
        status: 'pending',
      })
      .returning();
    
    return family;
  }

  /**
   * Adds an R&R entitlement to a specific family.
   */
  static async addEntitlementToFamily(familyId: string, data: CreateEntitlementRequest) {
    const [entitlement] = await db
      .insert(rrEntitlements)
      .values({
        familyId,
        entitlementType: data.entitlementType,
        amount: data.amount ?? null,
        description: data.description ?? null,
        status: 'pending',
      })
      .returning();
    
    return entitlement;
  }

  /**
   * Updates the status of an entitlement (e.g., to 'provided').
   */
  static async updateEntitlementStatus(entitlementId: string, data: UpdateEntitlementRequest) {
    const [entitlement] = await db
      .update(rrEntitlements)
      .set({
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(rrEntitlements.id, entitlementId))
      .returning();
      
    return entitlement;
  }
}