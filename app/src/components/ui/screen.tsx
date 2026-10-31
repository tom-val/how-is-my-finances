import type { ReactNode } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { useIsWide } from "@/hooks/useIsWide";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

interface ScreenProps {
  children: ReactNode;
  /** Pull-to-refresh handler (native). Usually `refetch` from the screen's main query. */
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}

/**
 * Scrollable page body: the PWA's `<main className="mx-auto max-w-5xl px-4 py-6">`. On phones the
 * bottom padding clears the tab bar, which is laid out below the screen by the tab navigator.
 */
export function Screen({ children, onRefresh, refreshing = false, className }: ScreenProps) {
  const { colours } = useTheme();
  const isWide = useIsWide();
  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName={cn(
        "mx-auto w-full max-w-5xl gap-6 px-4 py-6",
        isWide ? "pb-6" : "pb-10",
        className,
      )}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colours["muted-foreground"]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
