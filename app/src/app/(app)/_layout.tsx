import { Tabs } from "expo-router/tabs";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { NotificationUploader } from "@/features/notifications/NotificationUploader";

export default function AppLayout() {
  return (
    <>
      <NotificationUploader />
      <Tabs
        tabBar={(props) => <BottomNav {...props} />}
        screenOptions={{
          header: () => <AppHeader />,
          title: "Finansai",
        }}
      >
        <Tabs.Screen name="(months)" />
        <Tabs.Screen name="inbox" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="recurring" />
        <Tabs.Screen name="(settings)" />
      </Tabs>
    </>
  );
}
