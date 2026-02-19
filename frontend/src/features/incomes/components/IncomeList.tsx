import { useTranslation } from "react-i18next";
import { useIncomes } from "../hooks/useIncomes";
import { IncomeCard } from "./IncomeCard";
import { CreateIncomeDialog } from "./CreateIncomeDialog";

interface IncomeListProps {
  monthId: string;
}

export function IncomeList({ monthId }: IncomeListProps) {
  const { t } = useTranslation();
  const { data: incomes, isLoading, error } = useIncomes(monthId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("incomes.title")}</h2>
        <CreateIncomeDialog monthId={monthId} />
      </div>

      {isLoading && (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      )}

      {error && <p className="text-destructive">{t("common.error")}</p>}

      {incomes && incomes.length === 0 && (
        <p className="text-muted-foreground">{t("incomes.noIncomes")}</p>
      )}

      {incomes && incomes.length > 0 && (
        <div className="flex flex-col gap-2">
          {incomes.map((income) => (
            <IncomeCard key={income.id} income={income} monthId={monthId} />
          ))}
        </div>
      )}
    </div>
  );
}
