import { NextRequest, NextResponse } from 'next/server';
import { PossessionService } from '@/lib/services/possession';
import { CreatePossessionRequestSchema } from '@/lib/dtos/possession';
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

    const records = await PossessionService.getPossessionRecords(projectId);
    return NextResponse.json({ data: records });
  } catch (error: any) {
    console.error('Error fetching possession records:', error);
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
    const parsed = CreatePossessionRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Invalid request', details: parsed.error.issues } },
        { status: 400 }
      );
    }

    const record = await PossessionService.recordPossession(projectId, parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating possession record:', error);
    return NextResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}