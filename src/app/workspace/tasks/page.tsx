import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function WorkspaceTasksPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground max-w-2xl">
            View and manage workflow tasks assigned to you.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This page is under construction. Future updates will aggregate all your assigned tasks here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
