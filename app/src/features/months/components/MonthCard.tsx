import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Link } from "expo-router";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { MonthSummary } from "@shared/types/month";

interface MonthCardProps {
  month: MonthSummary;
}

export function MonthCard({ month }: MonthCardProps) {
  const { t } = useTranslation();

  return (
    <Link href={`/months/${month.id}`} asChild>
      <Pressable accessibilityRole="link" className="active:opacity-80">
        <Card className="gap-0 p-0 web:transition-colors web:hover:bg-muted/50">
          <CardContent className="px-4 py-3">
            <Text className="mb-1 text-sm font-semibold">
              {t(`months.monthNames.${month.monthNumber}`)} {month.year}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">{t("months.salary")}</Text>
              <Text className="text-xs font-medium">{month.salary.toFixed(2)} EUR</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">{t("months.remaining")}</Text>
              <Text
                className={cn(
                  "text-xs font-medium",
                  month.remaining < 0 ? "text-destructive" : "text-green-600 dark:text-green-400",
                )}
              >
                {month.remaining.toFixed(2)} EUR
              </Text>
            </View>
          </CardContent>
        </Card>
      </Pressable>
    </Link>
  );
}
