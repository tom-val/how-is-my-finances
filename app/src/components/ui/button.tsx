import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Text, TextClassContext } from "./text";

const buttonVariants = cva(
  "flex-row items-center justify-center gap-2 rounded-md web:transition-colors web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "bg-primary active:opacity-90 web:hover:opacity-90",
        destructive: "bg-destructive active:opacity-90 web:hover:opacity-90",
        outline:
          "border border-input bg-background active:bg-accent web:hover:bg-accent dark:bg-input/30",
        secondary: "bg-secondary active:opacity-80 web:hover:opacity-80",
        ghost: "active:bg-accent web:hover:bg-accent",
        link: "",
      },
      size: {
        default: "h-11 px-4 md:h-9",
        sm: "h-9 gap-1.5 px-3 md:h-8",
        lg: "h-12 px-6 md:h-10",
        icon: "h-11 w-11 md:h-9 md:w-9",
        "icon-sm": "h-9 w-9 md:h-8 md:w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("text-sm font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-white",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary web:hover:underline",
    },
  },
  defaultVariants: { variant: "default" },
});

type ButtonProps = ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner in place of the content and disables the button. */
    loading?: boolean;
    /** Extra classes for the text and icons inside (e.g. a custom colour on an outline button). */
    textClassName?: string;
  };

/**
 * shadcn-style button. Children may be a string (wrapped in Text automatically) or Text/Icon nodes,
 * which pick up the variant's text colour. Touch targets are 44 dp on phones, 36 dp from `md` up,
 * matching the PWA's `min-h-11 md:min-h-0`.
 */
export function Button({
  className,
  textClassName,
  variant,
  size,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textClass = cn(buttonTextVariants({ variant }), textClassName);
  return (
    <TextClassContext.Provider value={textClass}>
      <Pressable
        role="button"
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size }), isDisabled && "opacity-50", className)}
        {...props}
      >
        {(state) =>
          loading ? (
            <ActivityIndicator size="small" className={textClass} />
          ) : typeof children === "string" ? (
            <Text>{children}</Text>
          ) : typeof children === "function" ? (
            children(state)
          ) : (
            children
          )
        }
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { buttonVariants, buttonTextVariants };
