import { type NextRequest } from 'next/server';
import { apiHandler, ApiHandlerContext } from '@/lib/api/handler';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { requireMinimumRole } from '@/lib/api/authorize';
import { successResponse, errorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { compensations, projects, auditEvents, parcels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { extractClientIp } from '@/lib/api/utils';
// Note: crypto module for SHA-256 is part of Node.js
import crypto from 'crypto';
import { PDFDocument, rgb } from 'pdf-lib';
import { minioClient } from '@/lib/storage/minio';
import fs from 'fs';
import path from 'path';

async function generateAward(request: NextRequest, { logger, params }: ApiHandlerContext) {
  const authResult = await getAuthenticatedUser(logger);
  if (!authResult.success) return authResult.response;
  const user = authResult.user;

  const authzError = requireMinimumRole(user, 'district_officer');
  if (authzError) return authzError;

  const projectId = params?.projectId as string;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required.');

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) return errorResponse('NOT_FOUND', 'Project not found.');

  // Scope check
  if (user.role !== 'admin' && user.role !== 'ministry_officer') {
    if (!user.stateCode || project.stateCode !== user.stateCode) {
      return errorResponse('FORBIDDEN', 'You do not have access to this project.');
    }
    if (user.role !== 'state_officer') {
      if (!user.districtCode || project.districtCode !== user.districtCode) {
        return errorResponse('FORBIDDEN', 'You do not have access to this project.');
      }
    }
  }

  // Workflow integrity check: can only generate award documents if the project has reached the award declaration phase.
  if (project.status !== 'award_declared') {
    return errorResponse('CONFLICT', `Cannot generate award documents from current status: ${project.status}. Project must be in 'award_declared' state.`);
  }

  // Ensure all parcels have a saved compensation record
  const projectParcels = await db.select().from(parcels).where(eq(parcels.projectId, projectId));
  const existingCompensations = await db.select().from(compensations).where(eq(compensations.projectId, projectId));
  
  if (existingCompensations.length < projectParcels.length) {
    return errorResponse('VALIDATION_ERROR', `Missing compensation calculations for ${projectParcels.length - existingCompensations.length} parcels. All parcels must be calculated and saved before generating the award.`);
  }

  const generatedRecords = [];
  const timestamp = new Date();

  await db.transaction(async (tx) => {
    // 1. Generate Compensation records Hashes and Update Status
    for (const comp of existingCompensations) {
      if (comp.status !== 'approved') {
        const parcel = projectParcels.find(p => p.id === comp.parcelId);
        
        // Generate actual PDF Bytes
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 400]);
        page.drawText(`FINAL AWARD DOCUMENT - Section 23 RFCTLARR 2013`, { x: 50, y: 350, size: 16 });
        page.drawText(`Project ID: ${projectId}`, { x: 50, y: 320, size: 12 });
        page.drawText(`Parcel ID: ${comp.parcelId}`, { x: 50, y: 300, size: 12 });
        page.drawText(`Owner: ${parcel?.ownerName || 'N/A'}`, { x: 50, y: 280, size: 12 });
        page.drawText(`Base Market Value: Rs. ${comp.baseMarketValue}`, { x: 50, y: 260, size: 12 });
        page.drawText(`Multiplication Factor: ${comp.multiplicationFactor}`, { x: 50, y: 240, size: 12 });
        page.drawText(`Solatium (100%): Rs. ${comp.solatiumAmount}`, { x: 50, y: 220, size: 12 });
        page.drawText(`TOTAL COMPENSATION AWARD: Rs. ${comp.totalAwardAmount}`, { x: 50, y: 200, size: 14, color: rgb(0, 0.5, 0) });
        page.drawText(`Generated on: ${timestamp.toISOString()}`, { x: 50, y: 160, size: 10 });
        page.drawText(`Authorized Officer: ${user.id}`, { x: 50, y: 140, size: 10 });

        const pdfBytes = await pdfDoc.save();

        // Cryptographic Hash of ACTUAL PDF BYTES
        const awardDocumentHash = crypto.createHash('sha256').update(Buffer.from(pdfBytes)).digest('hex');

        // Simulate Storage Upload (MinIO or Mock)
        const bucketName = 'bhushetu-awards';
        const fileName = `award-${projectId}-${comp.parcelId}.pdf`;
        
        try {
          if (minioClient) {
            const exists = await minioClient.bucketExists(bucketName).catch(() => false);
            if (!exists) {
              await minioClient.makeBucket(bucketName, 'us-east-1').catch(() => {});
            }
            await minioClient.putObject(bucketName, fileName, Buffer.from(pdfBytes), pdfBytes.length, {
              'Content-Type': 'application/pdf',
            });
          } else {
            // Fallback for local testing
            const localDir = path.join(process.cwd(), 'awards');
            if (!fs.existsSync(localDir)) {
              fs.mkdirSync(localDir, { recursive: true });
            }
            fs.writeFileSync(path.join(localDir, fileName), Buffer.from(pdfBytes));
          }
        } catch (uploadError) {
          throw new Error('STORAGE_UPLOAD_FAILED');
        }

        const [updated] = await tx.update(compensations)
          .set({
            status: 'approved',
            awardDocumentHash,
            updatedAt: timestamp
          })
          .where(eq(compensations.id, comp.id))
          .returning();
        
        // Log individual document generation audit event
        await tx.insert(auditEvents).values({
          eventType: 'award_document_generated',
          entityType: 'compensation',
          entityId: comp.id,
          actorId: user.id,
          actorRole: user.role,
          actorIp: extractClientIp(request),
          newValues: { awardDocumentHash },
          metadata: { projectId, parcelId: comp.parcelId, fileName }
        });

        generatedRecords.push(updated);
      }
    }

    // Project status is governed by the workflow task system.
    // We only log the audit event for document generation.

    // 3. Log Audit Event for Award Generation
    await tx.insert(auditEvents).values({
      eventType: 'award_documents_generated',
      entityType: 'project',
      entityId: projectId,
      actorId: user.id,
      actorRole: user.role,
      actorIp: extractClientIp(request),
      newValues: { status: 'award_declared', recordsGenerated: generatedRecords.length },
      metadata: { note: 'Final Award Declared under Section 23 of RFCTLARR Act 2013' }
    });
  });

  return successResponse({ message: 'Award documents generated successfully', count: generatedRecords.length });
}

export const POST = apiHandler(generateAward);
