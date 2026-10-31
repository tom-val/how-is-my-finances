import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

/** Muted activity indicator for inline loading states (a list inside a screen or dialog). */
export function Spinner({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { colours } = useTheme();
  return (
    <View className={cn("items-center justify-center py-6", className)}>
      <ActivityIndicator accessibilityLabel={t("common.loading")} color={colours["muted-foreground"]} />
    </View>
  );
}

/** Full-screen loading state for a screen's first fetch, centred where the content will appear. */
export function LoadingScreen() {
  return <Spinner className="flex-1 bg-background" />;
}
