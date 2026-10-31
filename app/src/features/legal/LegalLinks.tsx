import { Fragment } from "react";
import { View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";

type LegalPage = "privacy" | "terms";

const PAGES: { page: LegalPage; href: "/privacy" | "/terms"; label: string }[] = [
  { page: "privacy", href: "/privacy", label: "legal.privacy" },
  { page: "terms", href: "/terms", label: "legal.terms" },
];

/**
 * "Privacy policy · Terms" — the small muted row under the sign-in forms, in Settings and at the
 * foot of each legal page. Store review and Enable Banking need these reachable without an account.
 * `current` leaves out the page the row sits on.
 */
export function LegalLinks({ current }: { current?: LegalPage }) {
  const { t } = useTranslation();
  const pages = PAGES.filter((p) => p.page !== current);
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-2">
      {pages.map((p, i) => (
        <Fragment key={p.page}>
          {i > 0 ? <Text className="text-xs text-muted-foreground">·</Text> : null}
          <Link href={p.href}>
            <Text className="py-1 text-xs text-muted-foreground underline">{t(p.label)}</Text>
          </Link>
        </Fragment>
      ))}
    </View>
  );
}
