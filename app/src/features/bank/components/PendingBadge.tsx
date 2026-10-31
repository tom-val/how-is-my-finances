import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { usePendingCount } from "../hooks/useBankTransactions";

/** Small count of suggestions waiting in the Inbox; renders nothing at 0 (or before it loads). */
export function PendingBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { data } = usePendingCount();
  const count = data?.count ?? 0;
  if (count <= 0) return null;

  return (
    <View
      accessibilityLabel={t("bank.pendingBadge", { count })}
      className={cn(
        "h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1",
        className,
      )}
    >
      <Text className="text-[10px] font-semibold leading-none text-white">{count > 9 ? "9+" : String(count)}</Text>
    </View>
  );
}
