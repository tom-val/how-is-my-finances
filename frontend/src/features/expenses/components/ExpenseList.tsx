import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LayoutList, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpenses } from "../hooks/useExpenses";
import { ExpenseCard } from "./ExpenseCard";
import { CreateExpenseDialog } from "./CreateExpenseDialog";

type DisplayMode = "normal" | "compact";

const STORAGE_KEY = "expense-display-mode";

function getStoredDisplayMode(): DisplayMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "compact" ? "compact" : "normal";
}

interface ExpenseListProps {
  monthId: string;
}

export function ExpenseList({ monthId }: ExpenseListProps) {
  const { t } = useTranslation();
  const { data: expenses, isLoading, error } = useExpenses(monthId);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(getStoredDisplayMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, displayMode);
  }, [displayMode]);

  function toggleDisplayMode() {
    setDisplayMode((prev) => (prev === "normal" ? "compact" : "normal"));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("expenses.title")}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleDisplayMode}
            aria-label={
              displayMode === "normal"
                ? t("expenses.viewCompact")
                : t("expenses.viewNormal")
            }
          >
            {displayMode === "normal" ? (
              <List className="h-4 w-4" />
            ) : (
              <LayoutList className="h-4 w-4" />
            )}
          </Button>
          <CreateExpenseDialog monthId={monthId} />
        </div>
      </div>

      {isLoading && (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      )}

      {error && <p className="text-destructive">{t("common.error")}</p>}

      {expenses && expenses.length === 0 && (
        <p className="text-muted-foreground">{t("expenses.noExpenses")}</p>
      )}

      {expenses && expenses.length > 0 && (
        <div className="flex flex-col gap-2">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              monthId={monthId}
              compact={displayMode === "compact"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
