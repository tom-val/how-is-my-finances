import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { LegalLinks } from "@/features/legal/LegalLinks";

/** Centred column for the signed-out screens, with the language switcher top-right. */
export function AuthScreenLayout({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <View className="absolute right-4 z-10" style={{ top: insets.top + 16 }}>
        <LanguageSwitcher />
      </View>
      <KeyboardAwareScrollView
        contentContainerClassName="min-h-full items-center justify-center gap-4 px-4"
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + 24 }}
      >
        {children}
        <LegalLinks />
      </KeyboardAwareScrollView>
    </View>
  );
}
