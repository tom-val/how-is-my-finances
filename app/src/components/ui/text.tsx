import { createContext, useContext, type ComponentProps } from "react";
import { Text as RNText } from "react-native";
import { cn } from "@/lib/utils";

/**
 * React Native text doesn't inherit colour or size from its parent View, so containers that dictate
 * text styling (Button variants, list rows) provide classes here and every Text/Icon below merges them.
 */
export const TextClassContext = createContext<string | undefined>(undefined);

export function Text({ className, ...props }: ComponentProps<typeof RNText>) {
  const inherited = useContext(TextClassContext);
  return <RNText className={cn("text-base text-foreground", inherited, className)} {...props} />;
}
