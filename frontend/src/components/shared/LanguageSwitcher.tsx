import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  function toggleLanguage() {
    const nextLang = i18n.language === "lt" ? "en" : "lt";
    i18n.changeLanguage(nextLang);
  }

  return (
    <Button variant="ghost" size="sm" className="min-h-11 md:min-h-0" onClick={toggleLanguage}>
      {i18n.language === "lt" ? "EN" : "LT"}
    </Button>
  );
}
