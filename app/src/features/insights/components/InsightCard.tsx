import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

interface InsightCardProps {
  title: string;
  children: ReactNode;
}

export function InsightCard({ title, children }: InsightCardProps) {
  return (
    <Card className="grow gap-0 py-0">
      <CardContent className="gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <Text role="heading" className="text-sm font-semibold">
          {title}
        </Text>
        {children}
      </CardContent>
    </Card>
  );
}
