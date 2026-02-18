import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "./Header";
import { OfflineIndicator } from "./OfflineIndicator";
import { BottomNav } from "./BottomNav";
import { ServiceWorkerUpdatePrompt } from "./ServiceWorkerUpdatePrompt";

export function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <OfflineIndicator />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-20 md:pb-6">
        <Outlet />
      </main>
      <BottomNav />
      <ServiceWorkerUpdatePrompt />
    </div>
  );
}
