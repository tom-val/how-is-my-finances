import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Landmark, Search } from "lucide-react-native";
import { bankKeys, getAspsps } from "@/api/bank";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/ThemeProvider";
import type { Aspsp } from "@shared/types/bank";
import { useConnectBank } from "../hooks/useConnectBank";

/** EEA countries Enable Banking covers, Baltics first. */
export const BANK_COUNTRIES = [
  "LT", "LV", "EE", "FI", "SE", "DK", "NO", "DE", "PL", "NL", "BE", "FR", "ES", "IT", "AT", "IE", "PT",
] as const;

interface ConnectBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Choose a country and bank, then go to the bank to give consent. */
export function ConnectBankDialog({ open, onOpenChange }: ConnectBankDialogProps) {
  const { t } = useTranslation();
  const { colours } = useTheme();
  const [country, setCountry] = useState<string>("LT");
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const { connect } = useConnectBank();

  const { data: aspsps, isLoading, error } = useQuery({
    queryKey: bankKeys.aspsps(country),
    queryFn: () => getAspsps(country),
    enabled: open,
    staleTime: 60 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...(aspsps ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    return query ? sorted.filter((a) => a.name.toLowerCase().includes(query)) : sorted;
  }, [aspsps, search]);

  const countryOptions = BANK_COUNTRIES.map((code) => ({ value: code, label: t(`bank.countries.${code}`) }));

  async function handleChoose(aspsp: Aspsp) {
    if (chosen) return;
    setChosen(aspsp.name);
    const outcome = await connect({ name: aspsp.name, country: aspsp.country });
    // Web leaves the page; keep the spinner until it does.
    if (outcome === "redirected") return;
    setChosen(null);
    if (outcome === "connected") onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setSearch("");
      }}
      title={t("bank.connect")}
    >
      <View className="gap-2">
        <Label>{t("bank.country")}</Label>
        <Select
          value={country}
          onValueChange={(value) => {
            setCountry(value);
            setSearch("");
          }}
          options={countryOptions}
          placeholder={t("bank.country")}
        />
      </View>

      <View className="gap-2">
        <Label>{t("bank.chooseBank")}</Label>
        <View className="flex-row items-center gap-2 rounded-md border border-input px-3 dark:bg-input/30">
          <Icon as={Search} className="text-muted-foreground" />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t("bank.searchBank")}
            autoCorrect={false}
            className="flex-1 border-0 bg-transparent px-0 dark:bg-transparent web:focus-visible:ring-0"
          />
        </View>
      </View>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <Text className="text-sm text-destructive">{t("common.error")}</Text>
      ) : filtered.length === 0 ? (
        <Text className="py-6 text-center text-sm text-muted-foreground">{t("bank.noBanksFound")}</Text>
      ) : (
        <View className="overflow-hidden rounded-md border border-border">
          {filtered.map((aspsp, index) => (
            <Pressable
              key={`${aspsp.country}-${aspsp.name}`}
              onPress={() => void handleChoose(aspsp)}
              disabled={chosen !== null}
              accessibilityRole="button"
              accessibilityLabel={aspsp.name}
              className={cn(
                "min-h-14 flex-row items-center gap-3 px-3 py-2 active:bg-accent web:hover:bg-accent",
                index > 0 && "border-t border-border",
                chosen !== null && chosen !== aspsp.name && "opacity-50",
              )}
            >
              {/* Bank logos are mostly wide wordmarks, so give them a landscape box. */}
              <View className="h-10 w-16 items-center justify-center overflow-hidden rounded-md bg-white px-1">
                {aspsp.logo ? (
                  <Image
                    source={{ uri: aspsp.logo }}
                    style={{ width: 56, height: 32 }}
                    contentFit="contain"
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <Icon as={Landmark} className="text-neutral-500" />
                )}
              </View>
              <Text numberOfLines={1} className="flex-1 text-sm font-medium">
                {aspsp.name}
              </Text>
              {chosen === aspsp.name && (
                <ActivityIndicator size="small" color={colours["muted-foreground"]} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      <Text className="text-xs text-muted-foreground">{t("bank.connectDescription")}</Text>
    </Dialog>
  );
}
