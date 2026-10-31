import { View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "../components/AuthForm";
import { AuthScreenLayout } from "../components/AuthScreenLayout";

export function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();

  return (
    <AuthScreenLayout>
      <AuthForm mode="login" onSubmit={signIn} />
      <Link href="/forgot-password">
        <Text className="text-sm text-muted-foreground underline">{t("auth.forgotPassword")}</Text>
      </Link>
      <View className="flex-row flex-wrap justify-center">
        <Text className="text-sm text-muted-foreground">{t("auth.noAccount")} </Text>
        <Link href="/register">
          <Text className="text-sm text-muted-foreground underline">{t("auth.register")}</Text>
        </Link>
      </View>
    </AuthScreenLayout>
  );
}
