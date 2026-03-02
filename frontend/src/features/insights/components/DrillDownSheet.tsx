import { useTranslation } from "react-i18next";
import { Loader2, XIcon } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAnalyticsExpenses } from "../hooks/useInsights";

export interface DrillDownFilter {
  type: "category" | "vendor";
  id: string;
  name: string;
}

interface DrillDownSheetProps {
  filter: DrillDownFilter | null;
  onClose: () => void;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  currency: string;
}

export function DrillDownSheet({
  filter,
  onClose,
  startYear,
  startMonth,
  endYear,
  endMonth,
  currency,
}: DrillDownSheetProps) {
  const { t } = useTranslation();

  const { data: expenses, isLoading } = useAnalyticsExpenses(
    startYear,
    startMonth,
    endYear,
    endMonth,
    filter?.type === "category" ? filter.id : undefined,
    filter?.type === "vendor" ? filter.name : undefined,
  );

  const title =
    filter?.type === "category"
      ? t("insights.drillDown.category", { name: filter.name })
      : t("insights.drillDown.vendor", { name: filter?.name });

  return (
    <Sheet open={filter !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" showCloseButton={false} className="w-full overflow-y-auto pt-[env(safe-area-inset-top)] sm:w-3/4 sm:max-w-sm">
        <SheetHeader className="flex-row items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {expenses
                ? t("insights.drillDown.count", { count: expenses.length })
                : ""}
            </SheetDescription>
          </div>
          <SheetClose className="rounded-xs opacity-70 transition-opacity hover:opacity-100">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !expenses || expenses.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("insights.noData")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2 px-4 pb-4">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {expense.itemName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      filter?.type !== "category" && expense.categoryName,
                      filter?.type !== "vendor" && expense.vendor,
                      expense.expenseDate,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {expense.amount.toFixed(2)} {currency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
