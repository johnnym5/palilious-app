import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ActiveTasks() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>My Active Tasks</CardTitle>
        <CardDescription>Your 5 most recent, non-completed tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center pt-16">Task list is coming soon.</p>
        </div>
      </CardContent>
    </Card>
  );
}
