import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <WifiOff className="h-4 w-4" />
      <span>{t("common.offline")}</span>
    </div>
  );
}
