import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Command, CommandInput, CommandList } from "@/components/ui/command";

interface ComboboxDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder: string;
  search: string;
  onSearchChange: (value: string) => void;
  shouldFilter?: boolean;
  children: ReactNode;
}

export function ComboboxDrawer({
  open,
  onOpenChange,
  title,
  placeholder,
  search,
  onSearchChange,
  shouldFilter = false,
  children,
}: ComboboxDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex h-[85dvh] flex-col rounded-t-xl p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{title}</SheetDescription>
        </SheetHeader>
        {/* Drag handle for swipe-to-dismiss affordance */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted" />
        <Command shouldFilter={shouldFilter} className="flex flex-1 flex-col overflow-hidden">
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={onSearchChange}
            autoFocus
          />
          <CommandList className="max-h-none flex-1 overflow-y-auto">
            {children}
          </CommandList>
        </Command>
      </SheetContent>
    </Sheet>
  );
}
