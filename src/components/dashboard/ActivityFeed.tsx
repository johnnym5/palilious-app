import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivityFeed() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Requisition & Task Timeline</CardTitle>
        <CardDescription>A feed of the most recent activity.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center pt-16">Activity feed is coming soon.</p>
        </div>
      </CardContent>
    </Card>
  );
}
