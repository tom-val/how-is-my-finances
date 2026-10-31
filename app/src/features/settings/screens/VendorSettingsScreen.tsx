import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { LoadingScreen } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { getVendors, toggleVendorHidden } from "@/api/vendors";
import type { UserVendor } from "@shared/types/vendor";

export function VendorSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const {
    data: vendors,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors,
  });

  const toggleMutation = useMutation({
    mutationFn: (vendor: UserVendor) =>
      toggleVendorHidden(vendor.id, { isHidden: !vendor.isHidden }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vendors"] });
      void queryClient.invalidateQueries({ queryKey: ["visibleVendors"] });
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

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/settings");
  }

  if (isLoading) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <Screen onRefresh={refetch}>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={12}
          className="web:hover:opacity-70"
        >
          <Icon as={ArrowLeft} size={20} className="text-muted-foreground" />
        </Pressable>
        <Text role="heading" className="flex-1 text-2xl font-bold">
          {t("settings.vendors.title")}
        </Text>
      </View>

      <Card className="py-0">
        <CardContent className="gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <Text className="text-sm text-muted-foreground">{t("settings.vendors.description")}</Text>

          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t("settings.vendors.search")}
            autoCorrect={false}
          />

          {sortedVendors.length > 0 && (
            <Text className="text-xs text-muted-foreground">
              {t("settings.vendors.activeCount", { count: activeCount })}
              {" · "}
              {t("settings.vendors.hiddenCount", { count: hiddenCount })}
            </Text>
          )}

          {sortedVendors.length === 0 ? (
            <Text className="text-sm text-muted-foreground">{t("settings.vendors.noVendors")}</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {filteredVendors.map((vendor) => (
                <Pressable
                  key={vendor.id}
                  onPress={() => toggleMutation.mutate(vendor)}
                  disabled={toggleMutation.isPending}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !vendor.isHidden }}
                  className={cn(
                    "rounded-full px-3 py-1.5",
                    vendor.isHidden ? "bg-muted opacity-60" : "bg-primary/10",
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs",
                      vendor.isHidden ? "text-muted-foreground line-through" : "text-primary",
                    )}
                  >
                    {vendor.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </Screen>
  );
}
