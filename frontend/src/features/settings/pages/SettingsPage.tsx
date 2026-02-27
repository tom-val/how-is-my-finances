import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useTheme } from "next-themes";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

const AUTO_OPEN_KEY = "auto-open-current-month";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { accentColour, setAccentColour, presets } = useAccentColour();
  const { data: profile, isLoading, error } = useProfile();
  const [autoOpen, setAutoOpen] = useState(
    () => localStorage.getItem(AUTO_OPEN_KEY) === "true",
  );

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

  function handleAutoOpenChange(checked: boolean) {
    setAutoOpen(checked);
    localStorage.setItem(AUTO_OPEN_KEY, String(checked));
  }

  async function handleRefreshApp() {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    window.location.reload();
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

      {/* Behaviour Section */}
      <Card className="p-0">
        <CardContent className="flex flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-sm font-semibold">
            {t("settings.behaviour")}
          </h2>

          {/* Auto-open current month */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="auto-open-month">
                {t("settings.autoOpenCurrentMonth")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.autoOpenCurrentMonthDescription")}
              </p>
            </div>
            <Switch
              id="auto-open-month"
              checked={autoOpen}
              onCheckedChange={handleAutoOpenChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile Section — keyed by profile ID so form resets when profile data changes */}
      <ProfileForm key={profile.id} profile={profile} />

      {/* Vendor Management Link */}
      <Link to="/settings/vendors">
        <Card className="p-0 transition-colors hover:bg-accent/50">
          <CardContent className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">
                {t("settings.vendors.title")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("settings.vendors.description")}
              </span>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* Refresh App */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleRefreshApp}
      >
        {t("settings.refreshApp")}
      </Button>
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
