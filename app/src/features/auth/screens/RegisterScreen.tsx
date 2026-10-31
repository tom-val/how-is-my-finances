import { View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "../components/AuthForm";
import { AuthScreenLayout } from "../components/AuthScreenLayout";

export function RegisterScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();

  return (
    <AuthScreenLayout>
      <AuthForm mode="register" onSubmit={signUp} />
      <View className="flex-row flex-wrap justify-center">
        <Text className="text-sm text-muted-foreground">{t("auth.hasAccount")} </Text>
        <Link href="/login">
          <Text className="text-sm text-muted-foreground underline">{t("auth.login")}</Text>
        </Link>
      </View>
    </AuthScreenLayout>
  );
}
