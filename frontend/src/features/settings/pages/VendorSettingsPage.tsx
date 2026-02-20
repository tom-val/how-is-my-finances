import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useVendors } from "@/features/expenses/hooks/useExpenses";
import {
  useHiddenVendors,
  useSetHiddenVendors,
} from "../hooks/useHiddenVendors";

export function VendorSettingsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const { data: activeVendors, isLoading: isLoadingActive } = useVendors();
  const { data: hiddenVendors, isLoading: isLoadingHidden } =
    useHiddenVendors();
  const setHiddenVendors = useSetHiddenVendors();

  // Combine active + hidden into a single sorted list
  const allVendors = useMemo(() => {
    if (!activeVendors || !hiddenVendors) return [];

    const combined = new Set([...activeVendors, ...hiddenVendors]);
    return Array.from(combined).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [activeVendors, hiddenVendors]);

  const hiddenSet = useMemo(
    () => new Set(hiddenVendors ?? []),
    [hiddenVendors],
  );

  const filteredVendors = useMemo(() => {
    if (!search.trim()) return allVendors;

    const query = search.toLowerCase();
    return allVendors.filter((v) => v.toLowerCase().includes(query));
  }, [allVendors, search]);

  const activeCount = allVendors.filter((v) => !hiddenSet.has(v)).length;
  const hiddenCount = hiddenSet.size;

  function handleToggle(vendor: string) {
    const isCurrentlyHidden = hiddenSet.has(vendor);
    const newHidden = isCurrentlyHidden
      ? (hiddenVendors ?? []).filter((v) => v !== vendor)
      : [...(hiddenVendors ?? []), vendor];

    setHiddenVendors.mutate(newHidden, {
      onSuccess: () => toast.success(t("settings.vendors.saved")),
      onError: () => toast.error(t("common.error")),
    });
  }

  if (isLoadingActive || isLoadingHidden) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/settings"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">{t("settings.vendors.title")}</h1>
      </div>

      <Card className="p-0">
        <CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-sm text-muted-foreground">
            {t("settings.vendors.description")}
          </p>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("settings.vendors.search")}
          />

          {allVendors.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("settings.vendors.activeCount", { count: activeCount })}
              {" · "}
              {t("settings.vendors.hiddenCount", { count: hiddenCount })}
            </p>
          )}

          {allVendors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.vendors.noVendors")}
            </p>
          ) : (
            <div className="flex max-h-96 flex-wrap gap-2 overflow-y-auto">
              {filteredVendors.map((vendor) => {
                const isHidden = hiddenSet.has(vendor);
                return (
                  <button
                    key={vendor}
                    type="button"
                    onClick={() => handleToggle(vendor)}
                    disabled={setHiddenVendors.isPending}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      isHidden
                        ? "bg-muted text-muted-foreground line-through opacity-60"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {vendor}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
