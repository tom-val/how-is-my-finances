import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BellRing, Check, Clock, Link2, Sparkles, X } from "lucide-react-native";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { CategoryCombobox } from "@/features/expenses/components/CategoryCombobox";
import { VendorCombobox } from "@/features/expenses/components/VendorCombobox";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { BankTransaction } from "@shared/types/bank";
import type { Category } from "@shared/types/category";
import {
  useAcceptBankTransaction,
  useDismissBankTransaction,
  useLinkBankTransaction,
} from "../hooks/useBankTransactions";
import { formatSignedAmount } from "../lib/format";

interface BankTransactionCardProps {
  transaction: BankTransaction;
  /** Active (non-archived) categories. */
  categories: Category[];
  vendors: string[];
  /** The AI is categorising new rows: show a spinner where the suggestion will appear. */
  isCategorising?: boolean;
}

function Chip({ icon, label, className }: { icon: typeof Clock; label: string; className?: string }) {
  return (
    <View className={cn("flex-row items-center gap-1 rounded bg-muted px-1.5 py-0.5", className)}>
      <Icon as={icon} size={11} className="text-muted-foreground" />
      <Text className="text-[11px] font-medium text-muted-foreground">{label}</Text>
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text className="text-xs text-muted-foreground">{children}</Text>;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.status === 400 ? err.message : fallback;
}

/**
 * One suggestion in the Inbox. Fields start from the bank data and the rule/AI suggestion; anything
 * the user edits wins over later suggestions (e.g. when the AI finishes after the card rendered).
 */
export function BankTransactionCard({
  transaction,
  categories,
  vendors,
  isCategorising,
}: BankTransactionCardProps) {
  const { t } = useTranslation();
  const { colours } = useTheme();
  const accept = useAcceptBankTransaction();
  const dismiss = useDismissBankTransaction();
  const link = useLinkBankTransaction();

  const isDebit = transaction.direction === "debit";
  const defaultName =
    transaction.suggestedVendor ?? transaction.counterpartyName ?? transaction.description ?? "";

  // null = untouched: follow the latest suggestion.
  const [itemNameInput, setItemName] = useState<string | null>(null);
  const [categoryInput, setCategoryId] = useState<string | null>(null);
  const [vendorInput, setVendor] = useState<string | null>(null);
  const [sourceInput, setSource] = useState<string | null>(null);
  const [date, setDate] = useState(transaction.bookingDate);
  const [error, setError] = useState<string | null>(null);
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  const itemName = itemNameInput ?? defaultName;
  const categoryId = categoryInput ?? transaction.suggestedCategoryId ?? "";
  const vendor = vendorInput ?? transaction.suggestedVendor ?? "";
  const source = sourceInput ?? transaction.counterpartyName ?? "";

  const showAiBadge =
    transaction.suggestionSource === "ai" &&
    transaction.suggestedCategoryId !== null &&
    categoryId === transaction.suggestedCategoryId;
  const waitingForAi = isCategorising && isDebit && !transaction.suggestedCategoryId;

  const title = transaction.counterpartyName ?? transaction.description ?? t("bank.unknownCounterparty");
  const showDescription = transaction.description && transaction.description !== title;
  const isBusy = accept.isPending || dismiss.isPending || link.isPending;

  function handleAccept() {
    setError(null);
    if (isDebit) {
      if (!itemName.trim()) return setError(t("bank.itemNameRequired"));
      if (!categoryId) return setError(t("bank.categoryRequired"));
    } else if (!source.trim()) {
      return setError(t("bank.incomeSourceRequired"));
    }

    accept.mutate(
      {
        id: transaction.id,
        request: isDebit
          ? {
              itemName: itemName.trim(),
              categoryId,
              vendor: vendor.trim() || undefined,
              date,
            }
          : { source: source.trim(), date },
      },
      {
        onSuccess: () => toast.success(t("bank.accepted")),
        onError: (err) => toast.error(errorMessage(err, t("common.error"))),
      },
    );
  }

  function handleDismiss() {
    dismiss.mutate(transaction.id, { onError: () => toast.error(t("common.error")) });
  }

  function handleLink() {
    const duplicate = transaction.possibleDuplicate;
    if (!duplicate) return;
    link.mutate(
      { id: transaction.id, expenseId: duplicate.expenseId },
      {
        onSuccess: () => {
          setIsLinkOpen(false);
          toast.success(t("bank.linked"));
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  }

  return (
    <Card className="gap-3 py-0">
      <CardContent className="gap-3 px-4 py-4">
        {/* Bank data */}
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text numberOfLines={1} className="text-sm font-semibold">
              {title}
            </Text>
            {showDescription ? (
              <Text numberOfLines={2} className="text-xs text-muted-foreground">
                {transaction.description}
              </Text>
            ) : null}
            {(transaction.bookingStatus === "pending" || transaction.source === "notification") && (
              <View className="flex-row flex-wrap gap-1.5 pt-0.5">
                {transaction.bookingStatus === "pending" && (
                  <Chip icon={Clock} label={t("bank.pendingBooking")} />
                )}
                {transaction.source === "notification" && (
                  <Chip icon={BellRing} label={t("bank.fromNotification")} />
                )}
              </View>
            )}
          </View>
          <Text
            className={cn(
              "shrink-0 text-base font-semibold",
              isDebit ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
            )}
          >
            {formatSignedAmount(transaction.amount, transaction.currency, transaction.direction)}
          </Text>
        </View>

        {/* What it becomes */}
        {isDebit ? (
          <>
            <View className="gap-1">
              <FieldLabel>{t("expenses.itemName")}</FieldLabel>
              <Input
                value={itemName}
                onChangeText={setItemName}
                accessibilityLabel={t("expenses.itemName")}
                autoComplete="off"
              />
            </View>
            <View className="flex-row gap-2">
              <View className="min-w-0 flex-1 gap-1">
                <View className="flex-row items-center gap-1.5">
                  <FieldLabel>{t("expenses.category")}</FieldLabel>
                  {showAiBadge && (
                    <View
                      className="flex-row items-center gap-0.5 rounded bg-primary/10 px-1 py-px"
                      accessibilityLabel={t("bank.aiSuggested")}
                    >
                      <Icon as={Sparkles} size={10} className="text-primary" />
                      <Text className="text-[10px] font-semibold text-primary">{t("bank.aiBadge")}</Text>
                    </View>
                  )}
                  {waitingForAi && (
                    <ActivityIndicator
                      size="small"
                      color={colours["muted-foreground"]}
                      accessibilityLabel={t("bank.categorising")}
                      style={{ transform: [{ scale: 0.7 }] }}
                    />
                  )}
                </View>
                <CategoryCombobox value={categoryId} onChange={setCategoryId} categories={categories} />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <FieldLabel>{t("expenses.vendor")}</FieldLabel>
                <VendorCombobox value={vendor} onChange={setVendor} vendors={vendors} />
              </View>
            </View>
          </>
        ) : (
          <View className="gap-1">
            <FieldLabel>{t("bank.incomeSource")}</FieldLabel>
            <Input
              value={source}
              onChangeText={setSource}
              accessibilityLabel={t("bank.incomeSource")}
              autoComplete="off"
            />
          </View>
        )}

        {error && <Text className="text-sm text-destructive">{error}</Text>}

        {/* Date + actions */}
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <View className="min-w-32">
            <DateInput value={date} onChange={setDate} accessibilityLabel={t("expenses.date")} />
          </View>
          <View className="flex-row flex-wrap items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onPress={handleDismiss}
              disabled={isBusy}
              loading={dismiss.isPending}
              accessibilityLabel={t("bank.dismiss")}
            >
              <Icon as={X} size={14} />
              <Text>{t("bank.dismiss")}</Text>
            </Button>
            {transaction.possibleDuplicate && (
              <Button variant="outline" size="sm" onPress={() => setIsLinkOpen(true)} disabled={isBusy}>
                <Icon as={Link2} size={14} />
                <Text>{t("bank.alreadyAdded")}</Text>
              </Button>
            )}
            <Button size="sm" onPress={handleAccept} disabled={isBusy} loading={accept.isPending}>
              <Icon as={Check} size={14} />
              <Text>{t("bank.accept")}</Text>
            </Button>
          </View>
        </View>
      </CardContent>

      {transaction.possibleDuplicate && (
        <ConfirmDialog
          open={isLinkOpen}
          onOpenChange={setIsLinkOpen}
          title={t("bank.alreadyAdded")}
          description={t("bank.linkConfirm")}
          confirmLabel={t("bank.link")}
          cancelLabel={t("common.cancel")}
          onConfirm={handleLink}
          isPending={link.isPending}
        >
          <View className="gap-0.5 rounded-md border border-border px-3 py-2">
            <Text className="text-sm font-medium">{transaction.possibleDuplicate.itemName}</Text>
            <Text className="text-xs text-muted-foreground">
              {transaction.possibleDuplicate.amount.toFixed(2)} {transaction.currency} ·{" "}
              {transaction.possibleDuplicate.expenseDate}
            </Text>
          </View>
        </ConfirmDialog>
      )}
    </Card>
  );
}
