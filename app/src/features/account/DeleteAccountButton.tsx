import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useDeleteAccount } from "./useDeleteAccount";

/** "Delete account" with a confirmation step. Used in Settings and on the public /delete-account page. */
export function DeleteAccountButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const deleteAccount = useDeleteAccount();
  const [open, setOpen] = useState(false);

  function confirm() {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        setOpen(false);
        toast.success(t("account.deleted"));
      },
      onError: () => toast.error(t("account.deleteFailed")),
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className={className}
        textClassName="text-destructive"
        onPress={() => setOpen(true)}
      >
        <Icon as={Trash2} />
        <Text>{t("account.delete")}</Text>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("account.deleteTitle")}
        description={t("account.deleteDescription")}
        confirmLabel={t("account.deleteConfirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirm}
        destructive
        isPending={deleteAccount.isPending}
      />
    </>
  );
}
