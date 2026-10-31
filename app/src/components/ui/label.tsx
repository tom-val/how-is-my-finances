import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Text } from "./text";

export function Label({ className, ...props }: ComponentProps<typeof Text>) {
  return <Text className={cn("text-sm font-medium leading-none", className)} {...props} />;
}
