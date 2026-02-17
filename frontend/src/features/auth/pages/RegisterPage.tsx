import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";
import { useAuth } from "@/providers/AuthProvider";
import { AuthForm } from "../components/AuthForm";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export function RegisterPage() {
  const { t } = useTranslation();
  const { user, signUp } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <AuthForm mode="register" onSubmit={signUp} />
      <p className="text-sm text-muted-foreground">
        {t("auth.hasAccount")}{" "}
        <Link to="/login" className="underline hover:text-foreground">
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}
