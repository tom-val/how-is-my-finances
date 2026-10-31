import { useNetInfo } from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const { isConnected } = useNetInfo();
  // `null` means "not determined yet" — treat as online so the banner doesn't flash on launch.
  return { isOnline: isConnected !== false };
}
