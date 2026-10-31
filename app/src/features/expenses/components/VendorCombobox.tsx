import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomSheet, SheetEmpty, SheetItem } from "@/components/ui/bottom-sheet";
import { ComboboxTrigger } from "@/components/ui/combobox-trigger";

interface VendorComboboxProps {
  value: string;
  onChange: (value: string) => void;
  vendors: string[];
}

export function VendorCombobox({ value, onChange, vendors }: VendorComboboxProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) setSearch("");
  }

  function handleSelect(selectedVendor: string) {
    onChange(selectedVendor === value ? "" : selectedVendor);
    handleOpenChange(false);
  }

  // Allow free-text entry: if search doesn't match any vendor, show it as an option
  const hasExactMatch = vendors.some((v) => v.toLowerCase() === search.toLowerCase());
  const showCreate = search !== "" && !hasExactMatch;

  const filtered = vendors.filter((v) => v.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <ComboboxTrigger
        label={value || t("expenses.vendor")}
        isPlaceholder={!value}
        onPress={() => setIsOpen(true)}
      />
      <BottomSheet
        open={isOpen}
        onOpenChange={handleOpenChange}
        title={t("expenses.vendor")}
        search={{ value: search, onChange: setSearch, placeholder: t("expenses.vendor") }}
      >
        {filtered.length === 0 && !showCreate && <SheetEmpty>{t("expenses.noVendorsFound")}</SheetEmpty>}
        {showCreate && (
          <SheetItem
            label={search}
            selected={value === search}
            onPress={() => {
              onChange(search);
              handleOpenChange(false);
            }}
          />
        )}
        {filtered.map((v) => (
          <SheetItem key={v} label={v} selected={value === v} onPress={() => handleSelect(v)} />
        ))}
      </BottomSheet>
    </>
  );
}
