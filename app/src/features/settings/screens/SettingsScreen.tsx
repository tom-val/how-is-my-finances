import { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Link } from "expo-router";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Screen } from "@/components/ui/screen";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { getItem, setItem } from "@/lib/storage";
import { ACCENT_PRESETS } from "@/theme/palette";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";
import type { Profile } from "@shared/types/profile";
import { useProfile, useUpdateProfile } from "../hooks/useProfile";

const AUTO_OPEN_KEY = "auto-open-current-month";

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { preference, setPreference, accent, setAccent, colours } = useTheme();
  const { data: profile, isLoading, error, refetch, isRefetching } = useProfile();
  const [autoOpen, setAutoOpen] = useState(() => getItem(AUTO_OPEN_KEY) === "true");

  const profileLanguage = profile?.preferredLanguage;

  // Sync i18n language to profile on first load
  useEffect(() => {
    if (profileLanguage && profileLanguage !== i18n.language) {
      void i18n.changeLanguage(profileLanguage);
    }
  }, [profileLanguage, i18n]);

  function handleAutoOpenChange(checked: boolean) {
    setAutoOpen(checked);
    setItem(AUTO_OPEN_KEY, String(checked));
  }

  async function handleRefreshApp() {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      window.location.reload();
      return;
    }

    // Native: drop all cached server state, then reload the JS bundle when updates are enabled.
    try {
      if (Updates.isEnabled) {
        queryClient.clear();
        await Updates.reloadAsync();
      } else {
        await queryClient.resetQueries();
      }
    } catch {
      toast.error(t("common.error"));
    }
  }

  const version = Constants.expoConfig?.version;
  const updateId = Updates.updateId?.slice(0, 8);
  const versionLabel = [version ? `v${version}` : null, updateId].filter(Boolean).join(" · ");

  const themeOptions = [
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") },
    { value: "system", label: t("settings.themeSystem") },
  ];

  if (isLoading) {
    return (
      <Screen>
        <Text className="text-muted-foreground">{t("common.loading")}</Text>
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen onRefresh={refetch} refreshing={isRefetching}>
        <Text className="text-destructive">{t("common.error")}</Text>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <Text role="heading" className="text-2xl font-bold">
        {t("settings.title")}
      </Text>

      {/* Appearance Section */}
      <Card className="py-0">
        <CardContent className="gap-5 px-4 py-4 sm:px-6 sm:py-5">
          <Text role="heading" className="text-sm font-semibold">
            {t("settings.appearance")}
          </Text>

          {/* Theme */}
          <View className="gap-1.5">
            <Label>{t("settings.theme")}</Label>
            <Text className="text-xs text-muted-foreground">{t("settings.themeDescription")}</Text>
            <Select
              value={preference}
              onValueChange={(value) => setPreference(value as ThemePreference)}
              options={themeOptions}
              placeholder={t("settings.theme")}
            />
          </View>

          {/* Accent Colour */}
          <View className="gap-1.5">
            <Label>{t("settings.accentColour")}</Label>
            <Text className="text-xs text-muted-foreground">
              {t("settings.accentColourDescription")}
            </Text>
            <View className="flex-row flex-wrap gap-3 pt-1">
              {ACCENT_PRESETS.map((preset) => {
                const selected = accent === preset.key;
                return (
                  <Pressable
                    key={preset.key}
                    onPress={() => setAccent(preset.key)}
                    accessibilityRole="button"
                    accessibilityLabel={preset.label}
                    accessibilityState={{ selected }}
                    className="h-9 w-9 items-center justify-center rounded-full border-2"
                    style={{
                      backgroundColor: preset.swatch,
                      borderColor: selected ? colours.foreground : "transparent",
                    }}
                  >
                    {selected && <Icon as={Check} className="text-white" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Behaviour Section */}
      <Card className="py-0">
        <CardContent className="gap-5 px-4 py-4 sm:px-6 sm:py-5">
          <Text role="heading" className="text-sm font-semibold">
            {t("settings.behaviour")}
          </Text>

          {/* Auto-open current month */}
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-0.5">
              <Label>{t("settings.autoOpenCurrentMonth")}</Label>
              <Text className="text-xs text-muted-foreground">
                {t("settings.autoOpenCurrentMonthDescription")}
              </Text>
            </View>
            <Switch
              checked={autoOpen}
              onCheckedChange={handleAutoOpenChange}
              accessibilityLabel={t("settings.autoOpenCurrentMonth")}
            />
          </View>
        </CardContent>
      </Card>

      {/* Profile Section — keyed by profile ID so form resets when profile data changes */}
      <ProfileForm key={profile.id} profile={profile} />

      {/* Vendor Management Link */}
      <Link href="/settings/vendors" asChild>
        <Pressable accessibilityRole="link">
          <Card className="py-0">
            <CardContent className="flex-row items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
              <View className="flex-1 gap-0.5">
                <Text className="text-sm font-semibold">{t("settings.vendors.title")}</Text>
                <Text className="text-xs text-muted-foreground">
                  {t("settings.vendors.description")}
                </Text>
              </View>
              <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
            </CardContent>
          </Card>
        </Pressable>
      </Link>

      {/* Refresh App */}
      <Button variant="outline" className="w-full" onPress={() => void handleRefreshApp()}>
        {t("settings.refreshApp")}
      </Button>

      {versionLabel ? (
        <Text className="text-center text-xs text-muted-foreground">{versionLabel}</Text>
      ) : null}
    </Screen>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { t, i18n } = useTranslation();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [currency, setCurrency] = useState(profile.preferredCurrency);

  function handleLanguageChange(nextLang: string) {
    void i18n.changeLanguage(nextLang);
    updateProfile.mutate(
      { preferredLanguage: nextLang },
      {
        onSuccess: () => toast.success(t("settings.saved")),
        onError: () => toast.error(t("common.error")),
      },
    );
  }

  function handleSave() {
    updateProfile.mutate(
      {
        displayName: displayName || undefined,
        preferredCurrency: currency,
      },
      {
        onSuccess: () => toast.success(t("settings.saved")),
        onError: () => toast.error(t("common.error")),
      },
    );
  }

  const hasChanges =
    displayName !== (profile.displayName ?? "") || currency !== profile.preferredCurrency;

  return (
    <Card className="py-0">
      <CardContent className="gap-5 px-4 py-4 sm:px-6 sm:py-5">
        <Text role="heading" className="text-sm font-semibold">
          {t("settings.profile")}
        </Text>

        {/* Language */}
        <View className="gap-1.5">
          <Label>{t("settings.language")}</Label>
          <Text className="text-xs text-muted-foreground">{t("settings.languageDescription")}</Text>
          <Select
            value={i18n.language}
            onValueChange={handleLanguageChange}
            options={[
              { value: "en", label: "English" },
              { value: "lt", label: "Lietuvių" },
            ]}
            placeholder={t("settings.language")}
          />
        </View>

        {/* Display Name */}
        <View className="gap-1.5">
          <Label>{t("settings.displayName")}</Label>
          <Input
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t("settings.displayName")}
            autoComplete="name"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (hasChanges && !updateProfile.isPending) handleSave();
            }}
          />
        </View>

        {/* Currency */}
        <View className="gap-1.5">
          <Label>{t("settings.currency")}</Label>
          <Text className="text-xs text-muted-foreground">{t("settings.currencyDescription")}</Text>
          <Select
            value={currency}
            onValueChange={setCurrency}
            options={[{ value: "EUR", label: "EUR (Euro)" }]}
            placeholder={t("settings.currency")}
          />
        </View>

        {/* Save Button */}
        <Button onPress={handleSave} disabled={updateProfile.isPending || !hasChanges}>
          {updateProfile.isPending ? t("common.loading") : t("common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
