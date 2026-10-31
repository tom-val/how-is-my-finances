import { useWindowDimensions } from "react-native";

/** The PWA's `md` breakpoint: at 768 dp and wider the header nav replaces the bottom tab bar. */
export const WIDE_BREAKPOINT = 768;

export function useIsWide() {
  const { width } = useWindowDimensions();
  return width >= WIDE_BREAKPOINT;
}
