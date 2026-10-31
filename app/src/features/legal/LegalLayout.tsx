import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/useAuth";
import { LEGAL_CONTACT, LEGAL_LAST_UPDATED } from "./constants";
import { LegalLinks, type LegalPage } from "./LegalLinks";

/** One rendered block: a paragraph, or a bulleted list. */
export type Block = { p: string } | { bullets: string[] };

/** A titled section of a legal document. */
export type Section = { heading: string; blocks: Block[] };

/** A whole document in one language. Each page ships an English and a Lithuanian one. */
export type LegalDoc = { title: string; intro: string; sections: Section[] };

/** English unless the app is in Lithuanian, the same rule the rest of the i18n follows. */
export function usePickLanguage<T>(en: T, lt: T): T {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith("lt") ? lt : en;
}

/**
 * Shared chrome for the public legal pages (/privacy, /terms, /delete-account). They are root routes outside the
 * auth guards: Enable Banking, App Store and Google Play review open them from a link, before any
 * account exists. Plain text only, so nothing can fail to load.
 *
 * The documents live in the screen files as data in both languages rather than in translation.json:
 * they are long prose reviewed as a whole, not UI strings.
 */
export function LegalLayout({
  doc,
  current,
  children,
}: {
  doc: LegalDoc;
  current: LegalPage;
  /** Rendered after the sections, e.g. the delete-account page's button. */
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(user ? "/settings" : "/login");
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="mx-auto w-full max-w-3xl gap-6 px-4"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
    >
      <View className="flex-row items-center gap-2">
        <Button variant="ghost" size="icon" onPress={goBack} accessibilityLabel={t("common.back")}>
          <Icon as={ArrowLeft} size={20} />
        </Button>
        <Text role="heading" className="flex-1 text-2xl font-bold">
          {doc.title}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-xs text-muted-foreground">{t("legal.updated", { date: LEGAL_LAST_UPDATED })}</Text>
        <Text className="text-sm leading-6 text-muted-foreground">{doc.intro}</Text>
      </View>

      {doc.sections.map((section) => (
        <View key={section.heading} className="gap-2">
          <Text role="heading" className="text-base font-semibold">
            {section.heading}
          </Text>
          {section.blocks.map((block, i) =>
            "p" in block ? (
              <Text key={i} className="text-sm leading-6">
                {block.p}
              </Text>
            ) : (
              <View key={i} className="gap-1.5">
                {block.bullets.map((bullet, j) => (
                  <View key={j} className="flex-row gap-2">
                    <Text className="text-sm leading-6 text-muted-foreground">•</Text>
                    <Text className="flex-1 text-sm leading-6">{bullet}</Text>
                  </View>
                ))}
              </View>
            ),
          )}
        </View>
      ))}

      {children}

      <View className="items-center gap-1 border-t border-border pt-6">
        <Text className="text-sm text-muted-foreground">{t("legal.contact")}</Text>
        <Link href={`mailto:${LEGAL_CONTACT}`}>
          <Text className="text-sm font-medium text-primary">{LEGAL_CONTACT}</Text>
        </Link>
      </View>

      <LegalLinks current={current} />
    </ScrollView>
  );
}
