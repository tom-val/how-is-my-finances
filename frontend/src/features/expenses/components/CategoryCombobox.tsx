import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Category } from "@shared/types/category";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
}

export function CategoryCombobox({
  value,
  onChange,
  categories,
}: CategoryComboboxProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCategory = categories.find((c) => c.id === value);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedCategory?.name ?? t("expenses.category")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
        avoidCollisions
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("expenses.searchCategory")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[min(300px,var(--radix-popover-content-available-height,300px)_-_40px)]">
            <CommandEmpty>{t("expenses.noCategoriesFound")}</CommandEmpty>
            <CommandGroup>
              {filtered.map((cat) => (
                <CommandItem
                  key={cat.id}
                  value={cat.id}
                  onSelect={() => {
                    onChange(cat.id === value ? "" : cat.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === cat.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {cat.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
