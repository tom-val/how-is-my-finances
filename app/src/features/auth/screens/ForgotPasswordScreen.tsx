import { useState } from "react";
import { View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthScreenLayout } from "../components/AuthScreenLayout";

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(email.trim());
      setSentTo(email.trim());
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
          <CardTitle>{t("auth.forgotPasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          {sentTo ? (
            <Text className="text-sm text-muted-foreground">
              {t("auth.resetLinkSent", { email: sentTo })}
            </Text>
          ) : (
            <>
              <Text className="text-sm text-muted-foreground">
                {t("auth.forgotPasswordDescription")}
              </Text>
              <View className="gap-2">
                <Label nativeID="email-label">{t("auth.email")}</Label>
                <Input
                  aria-labelledby="email-label"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={() => void handleSubmit()}
                />
              </View>
              {error && <Text className="text-sm text-destructive">{error}</Text>}
              <Button onPress={() => void handleSubmit()} loading={isSubmitting}>
                {t("auth.sendResetLink")}
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
