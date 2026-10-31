import type { ComponentProps } from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils";
import { Text, TextClassContext } from "./text";

export function Card({ className, ...props }: ComponentProps<typeof View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          "flex-col gap-6 rounded-xl border border-border bg-card py-6 shadow-sm shadow-black/5",
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export function CardHeader({ className, ...props }: ComponentProps<typeof View>) {
  return <View className={cn("flex-col gap-1.5 px-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<typeof Text>) {
  return <Text role="heading" className={cn("font-semibold leading-none", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<typeof Text>) {
  return <Text className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<typeof View>) {
  return <View className={cn("px-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<typeof View>) {
  return <View className={cn("flex-row items-center px-6", className)} {...props} />;
}
