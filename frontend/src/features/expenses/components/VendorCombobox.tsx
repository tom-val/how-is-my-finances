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
import { ComboboxDrawer } from "@/components/ui/combobox-drawer";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

interface VendorComboboxProps {
  value: string;
  onChange: (value: string) => void;
  vendors: string[];
}

export function VendorCombobox({ value, onChange, vendors }: VendorComboboxProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  function handleSelect(selectedVendor: string) {
    onChange(selectedVendor === value ? "" : selectedVendor);
    setIsOpen(false);
    setSearch("");
  }

  // Allow free-text entry: if search doesn't match any vendor, show it as an option
  const hasExactMatch = vendors.some(
    (v) => v.toLowerCase() === search.toLowerCase(),
  );

  const filtered = vendors.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase()),
  );

  const listContent = (
    <>
      <CommandEmpty>{t("expenses.noVendorsFound")}</CommandEmpty>
      <CommandGroup>
        {search && !hasExactMatch && (
          <CommandItem
            value={search}
            onSelect={() => {
              onChange(search);
              setIsOpen(false);
              setSearch("");
            }}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                value === search ? "opacity-100" : "opacity-0",
              )}
            />
            {search}
          </CommandItem>
        )}
        {filtered.map((v) => (
          <CommandItem
            key={v}
            value={v}
            onSelect={() => handleSelect(v)}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                value === v ? "opacity-100" : "opacity-0",
              )}
            />
            {v}
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between font-normal"
          onClick={() => setIsOpen(true)}
        >
          <span className="truncate">
            {value || t("expenses.vendor")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        <ComboboxDrawer
          open={isOpen}
          onOpenChange={setIsOpen}
          title={t("expenses.vendor")}
          placeholder={t("expenses.vendor")}
          search={search}
          onSearchChange={setSearch}
        >
          {listContent}
        </ComboboxDrawer>
      </>
    );
  }

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
            {value || t("expenses.vendor")}
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
            placeholder={t("expenses.vendor")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[min(300px,var(--radix-popover-content-available-height,300px)_-_40px)]">
            {listContent}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
