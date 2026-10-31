import { BarChart3, Calendar, Grid2x2, Repeat, Settings, type LucideIcon } from "lucide-react-native";

/** Tab route name (src/app/(app)/…) → href, icon and label. Order is the tab order. */
export const NAV_ITEMS: { name: string; href: string; icon: LucideIcon; labelKey: string }[] = [
  { name: "(months)", href: "/", icon: Calendar, labelKey: "nav.months" },
  { name: "categories", href: "/categories", icon: Grid2x2, labelKey: "nav.categories" },
  { name: "insights", href: "/insights", icon: BarChart3, labelKey: "nav.insights" },
  { name: "recurring", href: "/recurring", icon: Repeat, labelKey: "nav.recurring" },
  { name: "(settings)", href: "/settings", icon: Settings, labelKey: "nav.settings" },
];
