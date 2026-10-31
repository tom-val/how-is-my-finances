import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";

/**
 * Width of a View measured with `onLayout` (0 until the first layout). The PWA's recharts
 * `ResponsiveContainer` equivalent: charts size themselves to the card they sit in.
 */
export function useLayoutWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    setWidth((previous) => (previous === next ? previous : next));
  }, []);
  return { width, onLayout };
}
