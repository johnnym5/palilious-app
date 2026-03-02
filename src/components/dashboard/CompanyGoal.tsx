'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target } from "lucide-react";
import { RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis } from "recharts";

export function CompanyGoal() {
  const goalProgress = 65;
  const data = [{ name: 'Q1 Revenue', value: goalProgress }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Company Goal
        </CardTitle>
        <CardDescription>Q1 Revenue Target</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <div className="relative h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                    innerRadius="80%" 
                    outerRadius="100%" 
                    data={data} 
                    startAngle={90} 
                    endAngle={-270}
                    barSize={12}
                >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar 
                        background 
                        dataKey='value' 
                        cornerRadius={10}
                        className="fill-primary"
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold font-headline text-foreground">{goalProgress}%</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
