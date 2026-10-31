import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { getItem, setItem } from "@/lib/storage";
import en from "./en/translation.json";
import lt from "./lt/translation.json";

export const SUPPORTED_LANGUAGES = ["en", "lt"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// Same key the PWA's i18next-browser-languagedetector used, so web users keep their choice.
const STORAGE_KEY = "i18nextLng";

function detectLanguage(): Language {
  const stored = getItem(STORAGE_KEY);
  if (stored === "en" || stored === "lt") return stored;
  const device = getLocales()[0]?.languageCode;
  return device === "lt" ? "lt" : "en";
}

// eslint-disable-next-line import/no-named-as-default-member -- i18next documents the default instance API
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    lt: { translation: lt },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => setItem(STORAGE_KEY, lng));

export default i18n;
