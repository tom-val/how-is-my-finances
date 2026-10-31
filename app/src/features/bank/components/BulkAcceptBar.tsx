import { useTranslation } from "react-i18next";
import { CheckCheck } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useAcceptBulk } from "../hooks/useBankTransactions";

interface BulkAcceptBarProps {
  /** Suggestions that already have a category (only those can be accepted in bulk). */
  ids: string[];
}

/** "Accept N with suggested category". */
export function BulkAcceptBar({ ids }: BulkAcceptBarProps) {
  const { t } = useTranslation();
  const acceptBulk = useAcceptBulk();

  if (ids.length < 2) return null;

  function handleAccept() {
    acceptBulk.mutate(ids, {
      onSuccess: ({ accepted }) => toast.success(t("bank.bulkAccepted", { count: accepted })),
      onError: () => toast.error(t("common.error")),
    });
  }

  return (
    <Button variant="outline" className="w-full" onPress={handleAccept} loading={acceptBulk.isPending}>
      <Icon as={CheckCheck} size={16} />
      <Text>{t("bank.acceptAll", { count: ids.length })}</Text>
    </Button>
  );
}
