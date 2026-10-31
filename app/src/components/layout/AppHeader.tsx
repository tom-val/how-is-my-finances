import { View } from "react-native";
import { Link, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useIsWide } from "@/hooks/useIsWide";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navItems";
import { OfflineIndicator } from "./OfflineIndicator";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/months");
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppHeader() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isWide = useIsWide();

  return (
    <View className="bg-background" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border">
        <View className="mx-auto h-14 w-full max-w-5xl flex-row items-center justify-between px-4">
          <View className="flex-row items-center gap-6">
            <Link href="/">
              <Text className="text-lg font-semibold">Finansai</Text>
            </Link>
            {isWide && (
              <View className="flex-row items-center gap-4">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href as never}>
                    <Text
                      className={cn(
                        "text-sm",
                        isActive(pathname, item.href)
                          ? "font-medium text-foreground"
                          : "text-muted-foreground web:hover:text-foreground",
                      )}
                    >
                      {t(item.labelKey)}
                    </Text>
                  </Link>
                ))}
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onPress={() => void signOut()}>
              {t("auth.logOut")}
            </Button>
          </View>
        </View>
      </View>
      <OfflineIndicator />
    </View>
  );
}
