import { Tabs } from "expo-router/tabs";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        header: () => <AppHeader />,
        title: "Finansai",
      }}
    >
      <Tabs.Screen name="(months)" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="recurring" />
      <Tabs.Screen name="(settings)" />
    </Tabs>
  );
}
