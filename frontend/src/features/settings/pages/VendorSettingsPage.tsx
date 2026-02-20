import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getVendors, toggleVendorHidden } from "@/api/vendors";
import type { UserVendor } from "@shared/types/vendor";

export function VendorSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors,
  });

  const toggleMutation = useMutation({
    mutationFn: (vendor: UserVendor) =>
      toggleVendorHidden(vendor.id, { isHidden: !vendor.isHidden }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["visibleVendors"] });
      toast.success(t("settings.vendors.saved"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const sortedVendors = useMemo(() => {
    if (!vendors) return [];
    return [...vendors].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    if (!search.trim()) return sortedVendors;

    const query = search.toLowerCase();
    return sortedVendors.filter((v) => v.name.toLowerCase().includes(query));
  }, [sortedVendors, search]);

  const activeCount = sortedVendors.filter((v) => !v.isHidden).length;
  const hiddenCount = sortedVendors.filter((v) => v.isHidden).length;

  if (isLoading) {
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

          {sortedVendors.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("settings.vendors.activeCount", { count: activeCount })}
              {" · "}
              {t("settings.vendors.hiddenCount", { count: hiddenCount })}
            </p>
          )}

          {sortedVendors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.vendors.noVendors")}
            </p>
          ) : (
            <div className="flex max-h-96 flex-wrap gap-2 overflow-y-auto">
              {filteredVendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => toggleMutation.mutate(vendor)}
                  disabled={toggleMutation.isPending}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    vendor.isHidden
                      ? "bg-muted text-muted-foreground line-through opacity-60"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {vendor.name}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
