import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Search } from "lucide-react-native";
import { useIsWide } from "@/hooks/useIsWide";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { Input } from "./input";
import { KeyboardAwareScrollView } from "./keyboard-aware-scroll-view";
import { Text } from "./text";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** When set, a search field sits above the list (the PWA's ComboboxDrawer / cmdk input). */
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  children: ReactNode;
}

/**
 * A list of choices that slides up from the bottom (85% height on phones, like the PWA's
 * ComboboxDrawer) or appears as a centred list on wide screens. Used by Select and the comboboxes.
 */
export function BottomSheet({ open, onOpenChange, title, search, children }: BottomSheetProps) {
  const isWide = useIsWide();
  const insets = useSafeAreaInsets();
  const close = () => onOpenChange(false);

  return (
    <Modal
      visible={open}
      transparent
      animationType={isWide ? "fade" : "slide"}
      onRequestClose={close}
    >
      <View className={cn("flex-1", isWide ? "items-center justify-center p-4" : "justify-end")}>
        <Pressable accessibilityLabel="Close" onPress={close} className="absolute inset-0 bg-black/50" />
        <View
          className={cn(
            "bg-background",
            isWide
              ? cn(
                  "max-h-[70%] w-full max-w-md rounded-lg border border-border shadow-lg",
                  // Fixed height while searching so the dialog doesn't jump as results shrink.
                  search && "h-[420px]",
                )
              : search
                ? "h-[85%] rounded-t-xl"
                : "max-h-[85%] rounded-t-xl",
          )}
          style={isWide ? undefined : { paddingBottom: insets.bottom }}
        >
          {!isWide && <View className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted" />}
          <Text role="heading" className="px-4 pb-2 pt-3 text-base font-semibold">
            {title}
          </Text>
          {search && (
            <View className="flex-row items-center gap-2 border-b border-border px-3">
              <Icon as={Search} className="text-muted-foreground" />
              <Input
                value={search.value}
                onChangeText={search.onChange}
                placeholder={search.placeholder}
                autoFocus
                autoCorrect={false}
                className="flex-1 border-0 bg-transparent px-0 dark:bg-transparent web:focus-visible:ring-0"
              />
            </View>
          )}
          {/* The sheet keeps its height; the list's keyboard inset lets the last results scroll up above the keyboard. */}
          <KeyboardAwareScrollView contentContainerClassName="p-1">
            {children}
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface SheetItemProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  /** Secondary text on the right (e.g. a count). */
  detail?: string;
}

/** One row in a BottomSheet: a check mark column, the label, optional detail. */
export function SheetItem({ label, onPress, selected, detail }: SheetItemProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="min-h-11 flex-row items-center gap-2 rounded-sm px-2 py-2 active:bg-accent web:hover:bg-accent"
    >
      <Icon as={Check} className={selected ? "opacity-100" : "opacity-0"} />
      <Text className="flex-1 text-sm">{label}</Text>
      {detail ? <Text className="text-xs text-muted-foreground">{detail}</Text> : null}
    </Pressable>
  );
}

/** Centered "nothing found" line for an empty BottomSheet list. */
export function SheetEmpty({ children }: { children: string }) {
  return <Text className="py-6 text-center text-sm text-muted-foreground">{children}</Text>;
}
