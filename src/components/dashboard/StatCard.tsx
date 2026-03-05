import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from 'next/link';
import { Progress } from '../ui/progress';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  href: string;
  progress?: number;
  color?: string; // e.g. "text-sky-500"
}

export function StatCard({ title, value, icon: Icon, className, href, progress, color }: StatCardProps) {
  const progressIndicatorClass = color?.replace('text-', 'bg-');

  return (
    <Link href={href} className="block transition-all hover:-translate-y-1">
      <Card className={cn("h-full hover:bg-card", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={cn("h-5 w-5 text-muted-foreground", color)} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-headline">{value}</div>
           {progress !== undefined && (
            <div className="mt-2">
              <Progress value={progress} indicatorClassName={cn(progressIndicatorClass)} />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
