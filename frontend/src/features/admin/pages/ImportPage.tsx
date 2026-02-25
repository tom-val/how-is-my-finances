import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importData } from "@/api/import";
import { parseExcelFile } from "../utils/parseExcel";
import type { ImportFormat, ParsedExcelData } from "../utils/parseExcel";
import type { ImportRequest } from "@shared/types/import";

type ImportState = "idle" | "parsing" | "ready" | "importing" | "done";

const FORMATS: ImportFormat[] = ["tomas", "ugne"];

export function ImportPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<ImportFormat>("tomas");
  const [state, setState] = useState<ImportState>("idle");
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText === "DELETE";

  function handleFormatChange(newFormat: ImportFormat) {
    setFormat(newFormat);
    setParsedData(null);
    setConfirmText("");
    setError(null);
    setState("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setState("parsing");
    setError(null);
    setParsedData(null);
    setConfirmText("");

    try {
      const buffer = await file.arrayBuffer();
      const data = parseExcelFile(buffer, format);
      setParsedData(data);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
      setState("idle");
    }
  }

  async function handleImport() {
    if (!parsedData || !isConfirmed) return;

    setState("importing");
    setError(null);

    try {
      const request: ImportRequest = {
        categories: parsedData.categories,
        months: parsedData.months,
      };

      const result = await importData(request);

      // Invalidate all cached data so the app reflects imported data
      await queryClient.invalidateQueries();

      toast.success(
        t("admin.importSuccess", {
          categories: result.categoriesCreated,
          months: result.monthsCreated,
          expenses: result.expensesCreated,
          incomes: result.incomesCreated,
        }),
      );

      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setState("ready");
    }
  }

  function handleReset() {
    setState("idle");
    setParsedData(null);
    setConfirmText("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("admin.title")}</h1>

      <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{t("admin.warning")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.importTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Format selector */}
          <div className="flex flex-col gap-2">
            <Label>{t("admin.formatLabel")}</Label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <Button
                  key={f}
                  type="button"
                  variant={format === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFormatChange(f)}
                >
                  {t(`admin.format_${f}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* File input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="excel-file">{t("admin.selectFile")}</Label>
            <Input
              ref={fileInputRef}
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={state === "parsing" || state === "importing"}
            />
          </div>

          {/* Parsing state */}
          {state === "parsing" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("admin.parsingFile")}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Preview */}
          {parsedData && state !== "parsing" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="mb-2 text-sm font-medium">{t("admin.preview")}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div className="rounded-md bg-muted px-3 py-2">
                    {t("admin.monthsFound", { count: parsedData.months.length })}
                  </div>
                  <div className="rounded-md bg-muted px-3 py-2">
                    {t("admin.expensesFound", { count: parsedData.totalExpenses })}
                  </div>
                  <div className="rounded-md bg-muted px-3 py-2">
                    {t("admin.incomesFound", { count: parsedData.totalIncomes })}
                  </div>
                  <div className="rounded-md bg-muted px-3 py-2">
                    {t("admin.categoriesFound", { count: parsedData.categories.length })}
                  </div>
                </div>
              </div>

              {/* Categories list */}
              <div>
                <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                  {t("categories.title")}
                </h4>
                <div className="flex max-h-64 flex-wrap gap-1 overflow-y-auto">
                  {parsedData.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirmation */}
              {state === "ready" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-delete">{t("admin.confirmLabel")}</Label>
                  <Input
                    id="confirm-delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="max-w-xs"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleImport}
                    disabled={!isConfirmed}
                    className="w-fit"
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    {t("admin.importButton")}
                  </Button>
                </div>
              )}

              {/* Importing state */}
              {state === "importing" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("admin.importing")}
                </div>
              )}

              {/* Done state */}
              {state === "done" && (
                <Button variant="outline" onClick={handleReset} className="w-fit">
                  {t("admin.selectFile")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
