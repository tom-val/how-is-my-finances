import { useState } from "react";
import { View } from "react-native";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthScreenLayout } from "../components/AuthScreenLayout";

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { user, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      toast.success(t("auth.passwordUpdated"));
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.resetPasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          {/* The recovery link signs the user in before landing here; no session means the link is unusable. */}
          {!user ? (
            <>
              <Text className="text-sm text-muted-foreground">{t("auth.resetLinkInvalid")}</Text>
              <Button onPress={() => router.replace("/forgot-password")}>{t("auth.requestNewLink")}</Button>
            </>
          ) : (
            <>
              <View className="gap-2">
                <Label nativeID="password-label">{t("auth.newPassword")}</Label>
                <Input
                  aria-labelledby="password-label"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
              </View>
              <View className="gap-2">
                <Label nativeID="confirm-label">{t("auth.confirmPassword")}</Label>
                <Input
                  aria-labelledby="confirm-label"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={() => void handleSubmit()}
                />
              </View>
              {error && <Text className="text-sm text-destructive">{error}</Text>}
              <Button onPress={() => void handleSubmit()} loading={isSubmitting}>
                {t("auth.updatePassword")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <Link href="/login">
        <Text className="text-sm text-muted-foreground underline">{t("auth.backToLogin")}</Text>
      </Link>
    </AuthScreenLayout>
  );
}
