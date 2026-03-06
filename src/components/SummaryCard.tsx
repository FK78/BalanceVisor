import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function SummaryCard({ title, description, value, change, icon: Icon, color }: {
  title: string;
  description: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <Card className="summary-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardDescription className="text-sm font-semibold">
            {title}
          </CardDescription>
          <p className="text-muted-foreground text-xs">
            {description}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
          <Icon className="text-primary h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className={`text-2xl ${color}`}>
          {value}
        </CardTitle>
        <p className="text-muted-foreground mt-1 text-xs">
          {change}
        </p>
      </CardContent>
    </Card>
  );
}