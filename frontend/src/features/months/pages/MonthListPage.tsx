import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useMonths } from "../hooks/useMonths";
import { MonthCard } from "../components/MonthCard";
import { CreateMonthDialog } from "../components/CreateMonthDialog";

const AUTO_OPEN_KEY = "auto-open-current-month";
const HAS_REDIRECTED_KEY = "has-redirected-to-current-month";

export function MonthListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: months, isLoading, error } = useMonths();

  useEffect(() => {
    if (!months || months.length === 0) return;
    if (localStorage.getItem(AUTO_OPEN_KEY) !== "true") return;
    if (sessionStorage.getItem(HAS_REDIRECTED_KEY)) return;

    const now = new Date();
    const currentMonth = months.find(
      (m) => m.year === now.getFullYear() && m.monthNumber === now.getMonth() + 1,
    );

    if (currentMonth) {
      sessionStorage.setItem(HAS_REDIRECTED_KEY, "true");
      navigate(`/months/${currentMonth.id}`, { replace: true });
    }
  }, [months, navigate]);

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
