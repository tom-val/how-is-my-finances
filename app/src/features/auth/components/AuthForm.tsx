import { useRef, useState } from "react";
import { View, type TextInputInstance } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const { t } = useTranslation();
  const passwordRef = useRef<TextInputInstance>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="gap-4">
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
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
        </View>
        <View className="gap-2">
          <Label nativeID="password-label">{t("auth.password")}</Label>
          <Input
            ref={passwordRef}
            aria-labelledby="password-label"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            textContentType={mode === "login" ? "password" : "newPassword"}
            returnKeyType="go"
            onSubmitEditing={() => void handleSubmit()}
          />
        </View>
        {error && <Text className="text-sm text-destructive">{error}</Text>}
        <Button onPress={() => void handleSubmit()} loading={isSubmitting}>
          {mode === "login" ? t("auth.login") : t("auth.register")}
        </Button>
      </CardContent>
    </Card>
  );
}
