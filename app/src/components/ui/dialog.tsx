import type { ReactNode } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useIsWide } from "@/hooks/useIsWide";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Icon } from "./icon";
import { KeyboardAwareScrollView } from "./keyboard-aware-scroll-view";
import { Text } from "./text";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /**
   * "sheet" (default) — forms: a full-height sheet on phones (the native page sheet on iOS, swipe
   * down to dismiss), a centred dialog on wide screens. Same split as the PWA's ResponsiveDialog.
   * "alert" — short confirmations: a small centred card everywhere.
   */
  variant?: "sheet" | "alert";
  className?: string;
}

function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text role="heading" className="flex-1 text-lg font-semibold leading-none">
        {title}
      </Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={12}
        className="h-8 w-8 items-center justify-center rounded-sm opacity-70 active:opacity-100 web:hover:opacity-100"
      >
        <Icon as={X} />
      </Pressable>
    </View>
  );
}

export function Dialog({ open, onOpenChange, title, children, variant = "sheet", className }: DialogProps) {
  const isWide = useIsWide();
  const insets = useSafeAreaInsets();
  const close = () => onOpenChange(false);

  if (variant === "alert" || isWide) {
    return (
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        {/* A floating card: lift the whole card above the keyboard (keyboard-controller's version works on Android too). */}
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center p-4">
            <Pressable
              accessibilityLabel="Close"
              onPress={close}
              className="absolute inset-0 bg-black/50"
            />
            <View
              className={cn(
                "max-h-[90%] w-full rounded-lg border border-border bg-background shadow-lg",
                variant === "alert" ? "max-w-sm" : "max-w-lg",
                className,
              )}
            >
              <KeyboardAwareScrollView contentContainerClassName="gap-4 p-6">
                <DialogHeader title={title} onClose={close} />
                {children}
              </KeyboardAwareScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // iOS page sheets sit below the status bar already; elsewhere the sheet is full screen.
  const topInset = Platform.OS === "ios" ? 16 : insets.top + 12;

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={close}
    >
      <View className="flex-1 bg-background">
        <View className="px-4 pb-2" style={{ paddingTop: topInset }}>
          <DialogHeader title={title} onClose={close} />
        </View>
        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerClassName={cn("gap-4 px-4 pt-2", className)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          {children}
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Extra content between the description and the buttons (e.g. the item's name, an error). */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  isPending?: boolean;
}

/** Small centred confirmation (delete, archive) with Cancel / Confirm buttons on the right. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive,
  isPending,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} variant="alert">
      {description ? <Text className="text-sm text-muted-foreground">{description}</Text> : null}
      {children}
      <View className="flex-row justify-end gap-2">
        <Button variant="outline" onPress={() => onOpenChange(false)} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? "destructive" : "default"} onPress={onConfirm} loading={isPending}>
          {confirmLabel}
        </Button>
      </View>
    </Dialog>
  );
}
