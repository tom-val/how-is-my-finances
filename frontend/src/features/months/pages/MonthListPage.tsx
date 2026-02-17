import { useTranslation } from "react-i18next";
import { useMonths } from "../hooks/useMonths";
import { MonthCard } from "../components/MonthCard";
import { CreateMonthDialog } from "../components/CreateMonthDialog";

export function MonthListPage() {
  const { t } = useTranslation();
  const { data: months, isLoading, error } = useMonths();

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("months.title")}</h1>
        <CreateMonthDialog />
      </div>
      {months && months.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((month) => (
            <MonthCard key={month.id} month={month} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">{t("months.noMonths")}</p>
      )}
    </div>
  );
}
