import { View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { DeleteAccountButton } from "@/features/account/DeleteAccountButton";
import { useAuth } from "@/hooks/useAuth";
import { LEGAL_CONTACT } from "./constants";
import { LegalLayout, usePickLanguage, type LegalDoc } from "./LegalLayout";

/**
 * Public account-deletion page. Google Play asks for a URL where users can request deletion without
 * installing the app; signed in it offers the same button as Settings, signed out it explains how.
 * Keep the list of deleted data in step with AccountRepository.TablesInDeleteOrder.
 */
const EN: LegalDoc = {
  title: "Delete your account",
  intro:
    "You can delete your Finansai account and all of its data at any time. Deletion is permanent and cannot be undone.",
  sections: [
    {
      heading: "How to delete",
      blocks: [
        {
          bullets: [
            "In the app or on the website: Settings → Account → Delete account, then confirm.",
            "On this page: sign in and press \"Delete account\" below.",
            `Can't sign in? Email ${LEGAL_CONTACT} from the address you registered with and we'll delete the account within 30 days.`,
          ],
        },
      ],
    },
    {
      heading: "What is deleted",
      blocks: [
        {
          bullets: [
            "Your sign-in (email and password) and profile.",
            "Your months, expenses, incomes, categories, vendors and recurring expenses.",
            "Bank connections (the consent is revoked at Enable Banking), imported transactions, notification data, suggestions and rules.",
          ],
        },
        {
          p: "Everything is deleted immediately. Copies in our database provider's backups expire within their retention period. On Android, notification reading is switched off and anything still waiting on the phone is discarded.",
        },
      ],
    },
  ],
};

const LT: LegalDoc = {
  title: "Paskyros ištrynimas",
  intro:
    "Savo Finansai paskyrą ir visus jos duomenis galite ištrinti bet kada. Ištrynimas yra galutinis ir jo atšaukti negalima.",
  sections: [
    {
      heading: "Kaip ištrinti",
      blocks: [
        {
          bullets: [
            "Programėlėje ar svetainėje: Nustatymai → Paskyra → Ištrinti paskyrą ir patvirtinkite.",
            "Šiame puslapyje: prisijunkite ir paspauskite „Ištrinti paskyrą“ žemiau.",
            `Negalite prisijungti? Parašykite ${LEGAL_CONTACT} iš el. pašto, kuriuo registravotės, ir paskyrą ištrinsime per 30 dienų.`,
          ],
        },
      ],
    },
    {
      heading: "Kas ištrinama",
      blocks: [
        {
          bullets: [
            "Jūsų prisijungimas (el. paštas ir slaptažodis) ir profilis.",
            "Jūsų mėnesiai, išlaidos, pajamos, kategorijos, pardavėjai ir pasikartojančios išlaidos.",
            "Banko ryšiai (sutikimas atšaukiamas Enable Banking), importuotos operacijos, pranešimų duomenys, pasiūlymai ir taisyklės.",
          ],
        },
        {
          p: "Viskas ištrinama iš karto. Kopijos duomenų bazės teikėjo atsarginėse kopijose pasibaigia per jų saugojimo laikotarpį. Android telefone pranešimų skaitymas išjungiamas, o dar neįkelti pranešimai išmetami.",
        },
      ],
    },
  ],
};

export function DeleteAccountScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <LegalLayout doc={usePickLanguage(EN, LT)} current="delete-account">
      <View className="items-start gap-3 rounded-lg border border-border p-4">
        {user ? (
          <>
            <Text className="text-sm text-muted-foreground">{t("account.signedInAs", { email: user.email })}</Text>
            <DeleteAccountButton />
          </>
        ) : (
          <>
            <Text className="text-sm text-muted-foreground">{t("account.signInToDelete")}</Text>
            <Link href="/login" asChild>
              <Button variant="outline">{t("auth.login")}</Button>
            </Link>
          </>
        )}
      </View>
    </LegalLayout>
  );
}
