import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      toast.success(t("auth.passwordUpdated"));
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.resetPasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* The recovery link signs the user in before landing here; no session means the link is unusable. */}
          {!user ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t("auth.resetLinkInvalid")}
              </p>
              <Button asChild>
                <Link to="/forgot-password">{t("auth.requestNewLink")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">{t("auth.newPassword")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : t("auth.updatePassword")}
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
