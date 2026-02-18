import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

export function ServiceWorkerUpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;

    toast(t("common.updateAvailable"), {
      duration: Infinity,
      action: {
        label: t("common.reload"),
        onClick: () => updateServiceWorker(true),
      },
    });
  }, [needRefresh, t, updateServiceWorker]);

  return null;
}
