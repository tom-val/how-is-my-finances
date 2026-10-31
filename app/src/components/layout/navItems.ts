import { BarChart3, Calendar, Inbox, Repeat, Settings, type LucideIcon } from "lucide-react-native";

/** The tab whose item shows the pending bank suggestions badge. */
export const INBOX_ROUTE = "inbox";

/** Tab route name (src/app/(app)/…) → href, icon and label. Order is the tab order. */
export const NAV_ITEMS: { name: string; href: string; icon: LucideIcon; labelKey: string }[] = [
  { name: "(months)", href: "/", icon: Calendar, labelKey: "nav.months" },
  { name: INBOX_ROUTE, href: "/inbox", icon: Inbox, labelKey: "nav.inbox" },
  { name: "insights", href: "/insights", icon: BarChart3, labelKey: "nav.insights" },
  { name: "recurring", href: "/recurring", icon: Repeat, labelKey: "nav.recurring" },
  { name: "(settings)", href: "/settings", icon: Settings, labelKey: "nav.settings" },
];
