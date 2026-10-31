import { useCallback, useEffect, useState } from "react";
import { AppState, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BellRing, Check, Landmark, ShieldCheck, TriangleAlert } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import * as BankNotifications from "../../../modules/bank-notifications";
import {
  isNotificationSourceSupported,
  setTransactionSource,
  useTransactionSource,
  type TransactionSource,
} from "./transactionSource";

export function TransactionSourceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const source = useTransactionSource();
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [accessGranted, setAccessGranted] = useState(() => BankNotifications.isPermissionGranted());

  const supported = isNotificationSourceSupported();

  const refreshPermission = useCallback(() => {
    setAccessGranted(BankNotifications.isPermissionGranted());
  }, []);

  // Coming back from system settings makes the app active again: re-check notification access.
  useEffect(() => {
    if (!supported) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    return () => subscription.remove();
  }, [supported, refreshPermission]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/settings");
  }

  function choose(next: TransactionSource) {
    if (next === source) return;
    if (next === "notifications") {
      setDisclosureOpen(true);
      return;
    }
    setTransactionSource("bank");
  }

  function acceptDisclosure() {
    setDisclosureOpen(false);
    setTransactionSource("notifications");
    BankNotifications.requestPostNotificationsPermission();
    refreshPermission();
  }

  return (
    <Screen>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={12}
          className="web:hover:opacity-70"
        >
          <Icon as={ArrowLeft} size={20} className="text-muted-foreground" />
        </Pressable>
        <Text role="heading" className="flex-1 text-2xl font-bold">
          {t("notifications.title")}
        </Text>
      </View>

      {!supported ? (
        <Card className="py-0">
          <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
            <Text className="text-sm text-muted-foreground">
              {t("notifications.androidOnly")}
            </Text>
          </CardContent>
        </Card>
      ) : (
        <>
          <Text className="text-sm text-muted-foreground">{t("notifications.description")}</Text>

          <View className="gap-3" accessibilityRole="radiogroup">
            <SourceOption
              icon={Landmark}
              title={t("notifications.bankOption.title")}
              description={t("notifications.bankOption.description")}
              selected={source === "bank"}
              onPress={() => choose("bank")}
            />
            <SourceOption
              icon={BellRing}
              title={t("notifications.notificationsOption.title")}
              description={t("notifications.notificationsOption.description")}
              selected={source === "notifications"}
              onPress={() => choose("notifications")}
            />
          </View>

          {source === "bank" ? (
            <Text className="text-sm text-muted-foreground">
              {t("notifications.bankHint")}{" "}
              <Text
                accessibilityRole="link"
                onPress={() => router.push("/settings/bank")}
                className="text-sm font-medium text-primary web:hover:underline"
              >
                {t("notifications.bankHintLink")}
              </Text>
            </Text>
          ) : (
            <NotificationSetup accessGranted={accessGranted} />
          )}
        </>
      )}

      <Dialog
        open={disclosureOpen}
        onOpenChange={setDisclosureOpen}
        title={t("notifications.disclosure.title")}
        variant="alert"
      >
        <View className="flex-row items-start gap-3">
          <Icon as={ShieldCheck} size={20} className="mt-0.5 text-primary" />
          <Text className="flex-1 text-sm">{t("notifications.disclosure.intro")}</Text>
        </View>
        <View className="gap-2">
          <DisclosurePoint text={t("notifications.disclosure.whatIsRead")} />
          <DisclosurePoint text={t("notifications.disclosure.whereItGoes")} />
          <DisclosurePoint text={t("notifications.disclosure.nothingElse")} />
          <DisclosurePoint text={t("notifications.disclosure.switchOff")} />
        </View>
        <View className="flex-row justify-end gap-2 pt-2">
          <Button variant="outline" onPress={() => setDisclosureOpen(false)}>
            {t("notifications.disclosure.notNow")}
          </Button>
          <Button onPress={acceptDisclosure}>{t("notifications.disclosure.continue")}</Button>
        </View>
      </Dialog>
    </Screen>
  );
}

function SourceOption({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      className={cn(
        "flex-row items-start gap-3 rounded-xl border bg-card p-4 active:opacity-80 web:hover:bg-accent",
        selected ? "border-primary" : "border-border",
      )}
    >
      <Icon
        as={icon}
        size={20}
        className={cn("mt-0.5", selected ? "text-primary" : "text-muted-foreground")}
      />
      <View className="flex-1 gap-1">
        <Text className="font-medium">{title}</Text>
        <Text className="text-sm text-muted-foreground">{description}</Text>
      </View>
      <View
        className={cn(
          "mt-0.5 h-5 w-5 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary" : "border-input",
        )}
      >
        {selected && <Icon as={Check} size={12} className="text-primary-foreground" />}
      </View>
    </Pressable>
  );
}

function DisclosurePoint({ text }: { text: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-sm text-muted-foreground">•</Text>
      <Text className="flex-1 text-sm text-muted-foreground">{text}</Text>
    </View>
  );
}

function NotificationSetup({ accessGranted }: { accessGranted: boolean }) {
  const { t } = useTranslation();
  const showRestrictedHint = Platform.OS === "android" && Number(Platform.Version) >= 33;

  return (
    <Card className="py-0">
      <CardContent className="gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <View className="flex-row items-center gap-3">
          <Icon
            as={accessGranted ? Check : TriangleAlert}
            size={18}
            className={accessGranted ? "text-primary" : "text-destructive"}
          />
          <View className="flex-1">
            <Text className="text-sm font-medium">{t("notifications.access.label")}</Text>
            <Text className="text-sm text-muted-foreground">
              {accessGranted ? t("notifications.access.granted") : t("notifications.access.notGranted")}
            </Text>
          </View>
          <Button
            variant={accessGranted ? "outline" : "default"}
            size="sm"
            onPress={() => BankNotifications.openSettings()}
          >
            {t("notifications.access.openSettings")}
          </Button>
        </View>

        {!accessGranted && (
          <Text className="text-sm text-muted-foreground">{t("notifications.access.howTo")}</Text>
        )}

        {!accessGranted && showRestrictedHint && (
          <Text className="text-xs text-muted-foreground">
            {t("notifications.access.restrictedHint")}
          </Text>
        )}

        {accessGranted && (
          <Text className="text-sm text-muted-foreground">{t("notifications.access.ready")}</Text>
        )}
      </CardContent>
    </Card>
  );
}
