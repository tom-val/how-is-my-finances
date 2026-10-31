import { useContext } from "react";
import type { LucideIcon, LucideProps } from "lucide-react-native";
import { cssInterop } from "nativewind";
import { cn } from "@/lib/utils";
import { TextClassContext } from "./text";

type IconProps = LucideProps & { as: LucideIcon; className?: string };

function IconImpl({ as: IconComponent, ...props }: IconProps) {
  return <IconComponent {...props} />;
}

// Lets `className="text-primary size-5"` drive the SVG's colour and size props.
cssInterop(IconImpl, {
  className: {
    target: "style",
    nativeStyleToProp: { color: true, height: "size", width: "size" },
  },
});

/**
 * Lucide icon styled with classes. Default 16 dp (`size-4`, as shadcn sized icons) and the
 * surrounding text colour (TextClassContext), e.g. `<Icon as={Pencil} className="text-destructive" />`.
 */
export function Icon({ as, className, size = 16, ...props }: IconProps) {
  const inherited = useContext(TextClassContext);
  return (
    <IconImpl as={as} className={cn("text-foreground", inherited, className)} size={size} {...props} />
  );
}
