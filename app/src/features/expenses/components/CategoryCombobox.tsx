import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomSheet, SheetEmpty, SheetItem } from "@/components/ui/bottom-sheet";
import { ComboboxTrigger } from "@/components/ui/combobox-trigger";
import type { Category } from "@shared/types/category";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
}

export function CategoryCombobox({ value, onChange, categories }: CategoryComboboxProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCategory = categories.find((c) => c.id === value);

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) setSearch("");
  }

  function handleSelect(catId: string) {
    onChange(catId === value ? "" : catId);
    handleOpenChange(false);
  }

  return (
    <>
      <ComboboxTrigger
        label={selectedCategory?.name ?? t("expenses.category")}
        isPlaceholder={!selectedCategory}
        onPress={() => setIsOpen(true)}
      />
      <BottomSheet
        open={isOpen}
        onOpenChange={handleOpenChange}
        title={t("expenses.category")}
        search={{ value: search, onChange: setSearch, placeholder: t("expenses.searchCategory") }}
      >
        {filtered.length === 0 && <SheetEmpty>{t("expenses.noCategoriesFound")}</SheetEmpty>}
        {filtered.map((cat) => (
          <SheetItem
            key={cat.id}
            label={cat.name}
            selected={value === cat.id}
            onPress={() => handleSelect(cat.id)}
          />
        ))}
      </BottomSheet>
    </>
  );
}
