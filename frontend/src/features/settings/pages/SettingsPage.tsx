import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile, useUpdateProfile } from "../hooks/useProfile";
import { useAccentColour } from "../hooks/useAccentColour";
import type { Profile } from "@shared/types/profile";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { accentColour, setAccentColour, presets } = useAccentColour();
  const { data: profile, isLoading, error } = useProfile();

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error || !profile) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

  // Sync i18n language to profile on first load
  if (profile.preferredLanguage !== i18n.language) {
    i18n.changeLanguage(profile.preferredLanguage);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      {/* Appearance Section */}
      <Card className="p-0">
        <CardContent className="flex flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-sm font-semibold">{t("settings.appearance")}</h2>

          {/* Theme */}
          <div className="flex flex-col gap-1.5">
            <Label>{t("settings.theme")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("settings.themeDescription")}
            </p>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  {t("settings.themeLight")}
                </SelectItem>
                <SelectItem value="dark">
                  {t("settings.themeDark")}
                </SelectItem>
                <SelectItem value="system">
                  {t("settings.themeSystem")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Accent Colour */}
          <div className="flex flex-col gap-1.5">
            <Label>{t("settings.accentColour")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("settings.accentColourDescription")}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setAccentColour(preset.key)}
                  className="relative h-8 w-8 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: preset.swatch,
                    borderColor:
                      accentColour === preset.key
                        ? "var(--foreground)"
                        : "transparent",
                  }}
                  title={preset.label}
                >
                  {accentColour === preset.key && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Section — keyed by profile ID so form resets when profile data changes */}
      <ProfileForm key={profile.id} profile={profile} />
    </div>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { t, i18n } = useTranslation();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState(
    profile.displayName ?? "",
  );
  const [currency, setCurrency] = useState(profile.preferredCurrency);

  function handleLanguageChange(nextLang: string) {
    i18n.changeLanguage(nextLang);
    updateProfile.mutate(
      { preferredLanguage: nextLang },
      {
        onSuccess: () => toast.success(t("settings.saved")),
        onError: () => toast.error(t("common.error")),
      },
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
    displayName !== (profile.displayName ?? "") ||
    currency !== profile.preferredCurrency;

  return (
    <Card className="p-0">
      <CardContent className="flex flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-sm font-semibold">{t("settings.profile")}</h2>

        {/* Language */}
        <div className="flex flex-col gap-1.5">
          <Label>{t("settings.language")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("settings.languageDescription")}
          </p>
          <Select
            value={i18n.language}
            onValueChange={handleLanguageChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="lt">Lietuvių</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Display Name */}
        <div className="flex flex-col gap-1.5">
          <Label>{t("settings.displayName")}</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("settings.displayName")}
          />
        </div>

        {/* Currency */}
        <div className="flex flex-col gap-1.5">
          <Label>{t("settings.currency")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("settings.currencyDescription")}
          </p>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR (Euro)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending || !hasChanges}
        >
          {updateProfile.isPending ? t("common.loading") : t("common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
