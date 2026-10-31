import { useState, type ReactNode } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { useIsWide } from "@/hooks/useIsWide";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";

interface ScreenProps {
  children: ReactNode;
  /**
   * Pull-to-refresh handler (native). Return the refetch promise so the spinner stays until it
   * settles. The spinner only shows for pulls: background refetches (e.g. after a mutation
   * invalidates the query) must not pull the page down.
   */
  onRefresh?: () => unknown;
  className?: string;
}

/**
 * Scrollable page body: the PWA's `<main className="mx-auto max-w-5xl px-4 py-6">`. On phones the
 * bottom padding clears the tab bar, which is laid out below the screen by the tab navigator.
 */
export function Screen({ children, onRefresh, className }: ScreenProps) {
  const { colours } = useTheme();
  const isWide = useIsWide();
  const [isPulling, setIsPulling] = useState(false);

  async function handleRefresh() {
    setIsPulling(true);
    try {
      await onRefresh?.();
    } finally {
      setIsPulling(false);
    }
  }
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
          <RefreshControl
            refreshing={isPulling}
            onRefresh={() => void handleRefresh()}
            tintColor={colours["muted-foreground"]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
