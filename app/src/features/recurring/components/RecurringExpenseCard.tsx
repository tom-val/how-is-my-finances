import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { RecurringExpenseWithCategory } from "@shared/types/recurringExpense";
import { EditRecurringExpenseDialog } from "./EditRecurringExpenseDialog";
import { DeleteRecurringExpenseDialog } from "./DeleteRecurringExpenseDialog";
import { useUpdateRecurringExpense } from "../hooks/useRecurringExpenses";

interface RecurringExpenseCardProps {
  recurringExpense: RecurringExpenseWithCategory;
}

export function RecurringExpenseCard({ recurringExpense }: RecurringExpenseCardProps) {
  const { t } = useTranslation();
  const updateRecurring = useUpdateRecurringExpense();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function handleToggleActive() {
    updateRecurring.mutate({
      id: recurringExpense.id,
      request: { isActive: !recurringExpense.isActive },
    });
  }

  return (
    <>
      <Card className={cn("gap-0 py-0", !recurringExpense.isActive && "opacity-60")}>
        <CardContent className="flex-row items-center justify-between gap-2 px-3 py-2">
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-sm font-medium">
              {recurringExpense.itemName}
            </Text>
            <View className="flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
              <Text className="text-xs text-muted-foreground">{recurringExpense.categoryName}</Text>
              <Text className="text-xs text-muted-foreground">·</Text>
              <Text className="text-xs text-muted-foreground">
                {recurringExpense.amount.toFixed(2)} EUR
              </Text>
              <Text className="text-xs text-muted-foreground">·</Text>
              <Text className="text-xs text-muted-foreground">
                {t("recurring.dayOfMonth")} {recurringExpense.dayOfMonth}
              </Text>
              {recurringExpense.isManual && (
                <View className="rounded bg-orange-100 px-1 py-0.5 dark:bg-orange-950">
                  <Text className="text-[10px] font-medium text-orange-700 dark:text-orange-300">
                    {t("recurring.isManual")}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View className="flex-row items-center gap-1">
            <Switch
              checked={recurringExpense.isActive}
              onCheckedChange={handleToggleActive}
              disabled={updateRecurring.isPending}
              accessibilityLabel={
                recurringExpense.isActive ? t("recurring.active") : t("recurring.inactive")
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-7 md:w-7"
              hitSlop={6}
              onPress={() => setIsEditOpen(true)}
              aria-label={t("recurring.editRecurring")}
            >
              <Icon as={Pencil} size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-7 md:w-7"
              textClassName="text-destructive"
              hitSlop={6}
              onPress={() => setIsDeleteOpen(true)}
              aria-label={t("recurring.deleteRecurring")}
            >
              <Icon as={Trash2} size={14} />
            </Button>
          </View>
        </CardContent>
      </Card>

      {isEditOpen && (
        <EditRecurringExpenseDialog
          recurringExpense={recurringExpense}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      <DeleteRecurringExpenseDialog
        recurringExpenseId={recurringExpense.id}
        recurringExpenseName={recurringExpense.itemName}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
