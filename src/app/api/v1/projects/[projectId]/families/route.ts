import { NextRequest, NextResponse } from 'next/server';
import { RREntitlementsService } from '@/lib/services/rr-entitlements';
import { CreateFamilyRequestSchema } from '@/lib/dtos/rr-entitlements';
import { getUserCapabilities } from '@/app/actions/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Auth check
    const capabilities = await getUserCapabilities();
    if (!capabilities.canViewWorkspace) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 403 });
    }

    const families = await RREntitlementsService.getFamiliesByProject(projectId);
    return NextResponse.json({ data: families });
  } catch (error: any) {
    console.error('Error fetching R&R families:', error);
    return NextResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Auth check
    const capabilities = await getUserCapabilities();
    if (!capabilities.canApproveProposals) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateFamilyRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Invalid request', details: parsed.error.issues } },
        { status: 400 }
      );
    }

    const family = await RREntitlementsService.createFamily(projectId, parsed.data);
    return NextResponse.json({ data: family }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating affected family:', error);
    return NextResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}