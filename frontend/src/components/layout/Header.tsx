import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { Button } from "@/components/ui/button";

export function Header() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const location = useLocation();

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold">
            Finances
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className={`text-sm ${isActive("/") && !location.pathname.startsWith("/settings") && !location.pathname.startsWith("/recurring") ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("nav.months")}
            </Link>
            <Link
              to="/recurring"
              className={`text-sm ${isActive("/recurring") ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("nav.recurring")}
            </Link>
            <Link
              to="/settings"
              className={`text-sm ${isActive("/settings") ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("nav.settings")}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            {t("auth.logOut")}
          </Button>
        </div>
      </div>
    </header>
  );
}
