import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Calendar, Grid2x2, BarChart3, Repeat, Settings } from "lucide-react";

const navItems = [
  { to: "/", icon: Calendar, labelKey: "nav.months" },
  { to: "/categories", icon: Grid2x2, labelKey: "nav.categories" },
  { to: "/insights", icon: BarChart3, labelKey: "nav.insights" },
  { to: "/recurring", icon: Repeat, labelKey: "nav.recurring" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
] as const;

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  function isActive(path: string) {
    if (path === "/") {
      return (
        location.pathname === "/" ||
        location.pathname.startsWith("/months")
      );
    }
    return location.pathname.startsWith(path);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-[var(--safe-area-bottom)] md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map(({ to, icon: Icon, labelKey }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${
                active
                  ? "font-medium text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
