import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-center gap-2 bg-amber-500 px-4 py-2">
      <Icon as={WifiOff} className="text-amber-950" />
      <Text className="text-sm font-medium text-amber-950">{t("common.offline")}</Text>
    </View>
  );
}
