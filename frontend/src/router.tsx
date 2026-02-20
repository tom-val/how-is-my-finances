import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { MonthListPage } from "@/features/months/pages/MonthListPage";
import { MonthDetailPage } from "@/features/months/pages/MonthDetailPage";
import { CategoryBreakdownPage } from "@/features/months/pages/CategoryBreakdownPage";
import { CategoriesPage } from "@/features/categories/pages/CategoriesPage";
import { RecurringExpensesPage } from "@/features/recurring/pages/RecurringExpensesPage";
import { InsightsPage } from "@/features/insights/pages/InsightsPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { ImportPage } from "@/features/admin/pages/ImportPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <MonthListPage /> },
      { path: "months/:monthId", element: <MonthDetailPage /> },
      { path: "months/:monthId/breakdown", element: <CategoryBreakdownPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "insights", element: <InsightsPage /> },
      { path: "recurring", element: <RecurringExpensesPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "admin/import", element: <ImportPage /> },
    ],
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
]);
