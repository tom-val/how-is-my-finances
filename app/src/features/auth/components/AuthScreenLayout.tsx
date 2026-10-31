import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { LegalLinks } from "@/features/legal/LegalLinks";

/** Centred column for the signed-out screens, with the language switcher top-right. */
export function AuthScreenLayout({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <View className="absolute right-4 z-10" style={{ top: insets.top + 16 }}>
        <LanguageSwitcher />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="min-h-full items-center justify-center gap-4 px-4"
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + 24 }}
      >
        {children}
        <LegalLinks />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
