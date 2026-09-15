import { NextRequest, NextResponse } from 'next/server';
import { AuditExportService } from '@/lib/services/audit-export';
import { getUserCapabilities } from '@/app/actions/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Auth check: strict check to prevent bulk data scraping by standard viewers
    const capabilities = await getUserCapabilities();
    if (!capabilities.canApproveProposals) {
      return NextResponse.json({ error: { message: 'Unauthorized. Only managers/admins can export audit data.' } }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';

    const auditData = await AuditExportService.generateProjectExport(projectId);

    if (format === 'csv') {
      // In a real app, use a CSV stringifier. For this slice, we return 400 or a simple text format.
      // E.g. json2csv or fast-csv.
      return NextResponse.json({ error: { message: 'CSV format not implemented yet in MVP.' } }, { status: 400 });
    }

    return NextResponse.json({ data: auditData });
  } catch (error: any) {
    console.error('Error generating audit export:', error);
    return NextResponse.json({ error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}