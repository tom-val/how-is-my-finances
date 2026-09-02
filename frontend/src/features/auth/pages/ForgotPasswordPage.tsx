import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { user, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setSentTo(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.forgotPasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {sentTo ? (
            <p className="text-sm text-muted-foreground">
              {t("auth.resetLinkSent", { email: sentTo })}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t("auth.forgotPasswordDescription")}
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : t("auth.sendResetLink")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Link to="/login" className="text-sm text-muted-foreground underline hover:text-foreground">
        {t("auth.backToLogin")}
      </Link>
    </div>
  );
}
