import { NextRequest, NextResponse } from 'next/server';
import { RREntitlementsService } from '@/lib/services/rr-entitlements';
import { CreateEntitlementRequestSchema } from '@/lib/dtos/rr-entitlements';
import { getUserCapabilities } from '@/app/actions/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; familyId: string }> }
) {
  try {
    const { familyId } = await params;
    
    // Auth check
    const capabilities = await getUserCapabilities();
    if (!capabilities.canApproveProposals) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateEntitlementRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Invalid request', details: parsed.error.issues } },
        { status: 400 }
      );
    }

    const entitlement = await RREntitlementsService.addEntitlementToFamily(familyId, parsed.data);
    return NextResponse.json({ data: entitlement }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating R&R entitlement:', error);
    return NextResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}