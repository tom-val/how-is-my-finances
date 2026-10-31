import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react-native";
import { ActivityIndicator } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import { useBankSync } from "../hooks/useBankSync";

/** Header button that syncs every connection; shows "Syncing…" then "Categorising…". */
export function SyncButton() {
  const { t } = useTranslation();
  const { colours } = useTheme();
  const { start, isRunning, phase } = useBankSync();

  const label =
    phase === "categorising" ? t("bank.categorising") : phase === "syncing" ? t("bank.syncing") : t("bank.sync");

  return (
    <Button
      variant="outline"
      size="sm"
      onPress={() => start()}
      disabled={isRunning}
      accessibilityState={{ busy: isRunning }}
    >
      {isRunning ? (
        <ActivityIndicator size="small" color={colours["muted-foreground"]} />
      ) : (
        <Icon as={RefreshCw} size={14} />
      )}
      <Text>{label}</Text>
    </Button>
  );
}
