import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useUpdateProfile } from "@/features/settings/hooks/useProfile";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const updateProfile = useUpdateProfile();

  function toggleLanguage() {
    const nextLang = i18n.language === "lt" ? "en" : "lt";
    void i18n.changeLanguage(nextLang);
    updateProfile.mutate(
      { preferredLanguage: nextLang },
      {
        onError: () => toast.error(t("common.error")),
      },
    );
  }

  return (
    <Button variant="ghost" size="sm" onPress={toggleLanguage}>
      {i18n.language === "lt" ? "EN" : "LT"}
    </Button>
  );
}
