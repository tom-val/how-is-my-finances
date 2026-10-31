import { Platform, Switch as RNSwitch } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** The platform's own switch, tinted with the accent colour. */
export function Switch({ checked, onCheckedChange, disabled, accessibilityLabel }: SwitchProps) {
  const { colours } = useTheme();
  return (
    <RNSwitch
      value={checked}
      onValueChange={onCheckedChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: colours.input, true: colours.primary }}
      thumbColor={Platform.OS === "android" ? colours.background : undefined}
      ios_backgroundColor={colours.input}
      {...(Platform.OS === "web" ? { activeThumbColor: colours.background } : {})}
    />
  );
}
