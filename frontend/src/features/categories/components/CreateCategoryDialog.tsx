import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/shared/ResponsiveDialog";
import { useCreateCategory } from "../hooks/useCategories";

export function CreateCategoryDialog() {
  const { t } = useTranslation();
  const createCategory = useCreateCategory();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("categories.nameRequired"));
      return;
    }

    try {
      await createCategory.mutateAsync({ name: trimmed });
      resetForm();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}
    >
      <ResponsiveDialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t("categories.addCategory")}
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("categories.addCategory")}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoryName">{t("categories.name")}</Label>
            <Input
              id="categoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={createCategory.isPending}>
            {createCategory.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
