import { useSyncExternalStore } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleAlert, CircleCheck } from "lucide-react-native";
import { Icon } from "./icon";
import { Text } from "./text";

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const DURATION_MS = 4000;
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function push(kind: ToastKind, message: string) {
  const id = nextId++;
  items = [...items.slice(-2), { id, kind, message }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, DURATION_MS);
}

/** sonner-compatible API: `toast.success("Saved")`, `toast.error("Something went wrong")`. */
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Clears the bottom tab bar (icon + label, ~60px) so toasts don't cover navigation. */
const TAB_BAR_CLEARANCE = 72;

/** Renders the toast stack at the bottom of the screen, above the tab bar. Mounted once in the root layout. */
export function ToastHost() {
  const toasts = useSyncExternalStore(subscribe, () => items, () => items);
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 items-center gap-2 px-4"
      style={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
    >
      {toasts.map((t) => (
        // NativeWind classes don't reach Reanimated's Animated.View on web, so it gets a plain style
        // (max-w-sm) and the card itself is an inner View.
        <Animated.View key={t.id} entering={FadeInDown} exiting={FadeOutDown} style={{ width: "100%", maxWidth: 384 }}>
          <View
            role="alert"
            className="w-full flex-row items-center gap-2 rounded-lg border border-border bg-popover px-4 py-3 shadow-lg shadow-black/10"
          >
            <Icon
              as={t.kind === "success" ? CircleCheck : CircleAlert}
              className={t.kind === "success" ? "text-green-600" : "text-destructive"}
            />
            <Text className="flex-1 text-sm text-popover-foreground">{t.message}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
