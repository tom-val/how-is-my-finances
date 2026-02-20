import { RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { AccentColourProvider } from "@/features/settings/hooks/useAccentColour";
import { router } from "@/router";

export function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AccentColourProvider />
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
