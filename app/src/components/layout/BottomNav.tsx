import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { BottomTabBarProps } from "expo-router/tabs";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useIsWide } from "@/hooks/useIsWide";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navItems";

/** The PWA's mobile bottom nav as the tab bar. Hidden from `md` up, where AppHeader shows links. */
export function BottomNav({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isWide = useIsWide();

  if (isWide) return null;

  return (
    <View
      className="border-t border-border bg-background"
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center justify-around">
        {state.routes.map((route, index) => {
          const item = NAV_ITEMS.find((i) => i.name === route.name);
          if (!item) return null;
          const active = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (active) return;
                void Haptics.selectionAsync().catch(() => undefined);
                navigateToTab(route.key);
              }}
              className="min-h-11 flex-1 items-center justify-center gap-1 py-2"
            >
              <Icon
                as={item.icon}
                size={20}
                className={active ? "text-primary" : "text-muted-foreground"}
              />
              <Text
                numberOfLines={1}
                className={cn("text-xs", active ? "font-medium text-primary" : "text-muted-foreground")}
              >
                {t(item.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
