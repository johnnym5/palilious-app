import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type CompanyGoal } from "@/lib/types";

interface CompanyGoalsProps {
    goals: CompanyGoal[];
}

export function CompanyGoals({ goals }: CompanyGoalsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Company Goals (Q3)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {goals.map((goal) => (
                    <div key={goal.id} className="space-y-2">
                        <div className="flex justify-between items-end">
                            <p className="text-sm font-medium">{goal.title}</p>
                            <p className="text-sm text-muted-foreground">{goal.progress}%</p>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
