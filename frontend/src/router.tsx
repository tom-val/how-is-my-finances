import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { MonthListPage } from "@/features/months/pages/MonthListPage";
import { MonthDetailPage } from "@/features/months/pages/MonthDetailPage";
import { CategoriesPage } from "@/features/categories/pages/CategoriesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <MonthListPage /> },
      { path: "months/:monthId", element: <MonthDetailPage /> },
      { path: "categories", element: <CategoriesPage /> },
    ],
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
]);
