import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  href: string;
  color?: string;
}

export function StatCard({ title, value, icon: Icon, className, href, color }: StatCardProps) {
  return (
    <Link href={href} className="block transition-all hover:-translate-y-1">
      <Card className={cn("h-full hover:bg-card/70", className)}>
        <CardContent className="p-4 flex flex-col items-start gap-2">
            <div className={cn("p-2 rounded-lg bg-secondary", color)}>
                <Icon className={cn("h-5 w-5 text-foreground", color)} />
            </div>
            <p className="text-2xl font-bold font-headline">{value}</p>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
