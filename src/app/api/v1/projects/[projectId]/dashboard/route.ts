import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/lib/services/dashboard';
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

    const kpis = await DashboardService.getProjectKpis(projectId);
    return NextResponse.json({ data: kpis });
  } catch (error: any) {
    console.error('Error fetching dashboard KPIs:', error);
    return NextResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}