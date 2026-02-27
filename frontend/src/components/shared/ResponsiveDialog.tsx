import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { XIcon } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function ResponsiveDialog({
  children,
  ...props
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <Sheet {...props}>{children}</Sheet>;
  }

  return <Dialog {...props}>{children}</Dialog>;
}

export function ResponsiveDialogTrigger({
  children,
  ...props
}: ComponentProps<typeof DialogTrigger>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <SheetTrigger {...props}>{children}</SheetTrigger>;
  }

  return <DialogTrigger {...props}>{children}</DialogTrigger>;
}

export function ResponsiveDialogContent({
  children,
  className,
  ...props
}: ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          "h-[100dvh] overflow-y-auto px-4 pb-8 pt-[env(safe-area-inset-top)]",
          className,
        )}
      >
        {children}
      </SheetContent>
    );
  }

  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogHeader({
  children,
  ...props
}: ComponentProps<typeof DialogHeader>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <SheetHeader className="flex-row items-center justify-between px-0" {...props}>
        {children}
        <SheetClose className="rounded-xs opacity-70 transition-opacity hover:opacity-100">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </SheetHeader>
    );
  }

  return <DialogHeader {...props}>{children}</DialogHeader>;
}

export function ResponsiveDialogTitle({
  children,
  ...props
}: ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <SheetTitle {...props}>{children}</SheetTitle>;
  }

  return <DialogTitle {...props}>{children}</DialogTitle>;
}
