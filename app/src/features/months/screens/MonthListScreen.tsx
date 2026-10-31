import { useEffect } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { getItem } from "@/lib/storage";
import { useMonths } from "../hooks/useMonths";
import { MonthCard } from "../components/MonthCard";
import { CreateMonthDialog } from "../components/CreateMonthDialog";

const AUTO_OPEN_KEY = "auto-open-current-month";

// The PWA used sessionStorage for this; on native the JS runtime lives as long as the app session.
let hasRedirected = false;

export function MonthListScreen() {
  const { t } = useTranslation();
  const { data: months, isLoading, error, refetch, isRefetching } = useMonths();

  useEffect(() => {
    if (!months || months.length === 0) return;
    if (getItem(AUTO_OPEN_KEY) !== "true") return;
    if (hasRedirected) return;

    const now = new Date();
    const currentMonth = months.find(
      (m) => m.year === now.getFullYear() && m.monthNumber === now.getMonth() + 1,
    );

    if (currentMonth) {
      hasRedirected = true;
      // push, not replace: the month list stays underneath so back / swipe-back returns to it.
      router.push(`/months/${currentMonth.id}`);
    }
  }, [months]);

  if (isLoading) {
    return (
      <Screen>
        <Text className="text-muted-foreground">{t("common.loading")}</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
        <Text className="text-destructive">{t("common.error")}</Text>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View className="flex-row items-center justify-between gap-2">
        <Text role="heading" className="text-2xl font-bold">
          {t("months.title")}
        </Text>
        <CreateMonthDialog />
      </View>
      {months && months.length > 0 ? (
        <View className="-mx-2 flex-row flex-wrap">
          {months.map((month) => (
            <View key={month.id} className="w-full p-2 sm:w-1/2 lg:w-1/3">
              <MonthCard month={month} />
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-muted-foreground">{t("months.noMonths")}</Text>
      )}
    </Screen>
  );
}
