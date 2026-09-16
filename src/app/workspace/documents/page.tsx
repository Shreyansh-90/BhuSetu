import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function WorkspaceDocumentsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground max-w-2xl">
            Browse and search documents across all your assigned projects.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This page is under construction. Future updates will include a unified document view here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
