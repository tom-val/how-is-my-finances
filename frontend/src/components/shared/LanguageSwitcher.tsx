import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUpdateProfile } from "@/features/settings/hooks/useProfile";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const updateProfile = useUpdateProfile();

  function toggleLanguage() {
    const nextLang = i18n.language === "lt" ? "en" : "lt";
    i18n.changeLanguage(nextLang);
    updateProfile.mutate(
      { preferredLanguage: nextLang },
      {
        onError: () => toast.error(t("common.error")),
      },
    );
  }

  return (
    <Button variant="ghost" size="sm" className="min-h-11 md:min-h-0" onClick={toggleLanguage}>
      {i18n.language === "lt" ? "EN" : "LT"}
    </Button>
  );
}
