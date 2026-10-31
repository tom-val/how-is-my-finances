import { Stack } from "expo-router";

// The group has no index route, so name the tab's first screen explicitly; otherwise the stack
// opens on whichever route sorts first.
export const unstable_settings = { initialRouteName: "settings/index" };

export default function TabStackLayout() {
  return <Stack screenOptions={{ headerShown: false, title: "Finansai" }} />;
}
