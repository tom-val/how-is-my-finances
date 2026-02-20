import { Card, CardContent } from "@/components/ui/card";

interface InsightCardProps {
  title: string;
  children: React.ReactNode;
}

export function InsightCard({ title, children }: InsightCardProps) {
  return (
    <Card className="p-0">
      <CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}
