import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TriangleAlert, FileUp } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { importData } from "@/api/import";
import { parseExcelFile } from "../utils/parseExcel";
import type { ImportFormat, ParsedExcelData } from "../utils/parseExcel";
import type { ImportRequest } from "@shared/types/import";

type ImportState = "idle" | "parsing" | "ready" | "importing" | "done";

const FORMATS: ImportFormat[] = ["tomas", "ugne"];

const EXCEL_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];

export function ImportScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [format, setFormat] = useState<ImportFormat>("tomas");
  const [state, setState] = useState<ImportState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText === "DELETE";

  function handleFormatChange(newFormat: ImportFormat) {
    setFormat(newFormat);
    setParsedData(null);
    setFileName(null);
    setConfirmText("");
    setError(null);
    setState("idle");
  }

  async function handlePickFile() {
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: EXCEL_MIME_TYPES,
        copyToCacheDirectory: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open file");
      return;
    }

    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;

    setState("parsing");
    setError(null);
    setParsedData(null);
    setConfirmText("");
    setFileName(asset.name);

    try {
      // Web: the picker hands back a browser File. Native: read the cached copy from disk.
      const buffer = asset.file ? await asset.file.arrayBuffer() : await new File(asset.uri).arrayBuffer();
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
    setFileName(null);
    setConfirmText("");
    setError(null);
  }

  return (
    <Screen>
      <Text role="heading" className="text-2xl font-bold">
        {t("admin.title")}
      </Text>

      <View className="flex-row items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <Icon as={TriangleAlert} size={20} className="mt-0.5 text-destructive" />
        <Text className="flex-1 text-sm text-destructive">{t("admin.warning")}</Text>
      </View>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.importTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          {/* Format selector */}
          <View className="gap-2">
            <Label>{t("admin.formatLabel")}</Label>
            <View className="flex-row gap-2">
              {FORMATS.map((f) => (
                <Button
                  key={f}
                  variant={format === f ? "default" : "outline"}
                  size="sm"
                  onPress={() => handleFormatChange(f)}
                >
                  {t(`admin.format_${f}`)}
                </Button>
              ))}
            </View>
          </View>

          {/* File picker */}
          <View className="gap-2">
            <Label>{t("admin.selectFile")}</Label>
            <Button
              variant="outline"
              onPress={() => void handlePickFile()}
              disabled={state === "parsing" || state === "importing"}
              className="self-start"
            >
              <Icon as={FileUp} />
              <Text>{fileName ?? t("admin.selectFile")}</Text>
            </Button>
          </View>

          {/* Parsing state */}
          {state === "parsing" && (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" />
              <Text className="text-sm text-muted-foreground">{t("admin.parsingFile")}</Text>
            </View>
          )}

          {/* Error */}
          {error && <Text className="text-sm text-destructive">{error}</Text>}

          {/* Preview */}
          {parsedData && state !== "parsing" && (
            <View className="gap-4">
              <View>
                <Text role="heading" className="mb-2 text-sm font-medium">
                  {t("admin.preview")}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {[
                    t("admin.monthsFound", { count: parsedData.months.length }),
                    t("admin.expensesFound", { count: parsedData.totalExpenses }),
                    t("admin.incomesFound", { count: parsedData.totalIncomes }),
                    t("admin.categoriesFound", { count: parsedData.categories.length }),
                  ].map((label) => (
                    <View key={label} className="min-w-[45%] flex-1 rounded-md bg-muted px-3 py-2">
                      <Text className="text-sm">{label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Categories list */}
              <View>
                <Text role="heading" className="mb-1 text-xs font-medium text-muted-foreground">
                  {t("categories.title")}
                </Text>
                <View className="flex-row flex-wrap gap-1">
                  {parsedData.categories.map((cat) => (
                    <View key={cat} className="rounded-full bg-primary/10 px-2 py-0.5">
                      <Text className="text-xs text-primary">{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Confirmation */}
              {state === "ready" && (
                <View className="gap-2">
                  <Label>{t("admin.confirmLabel")}</Label>
                  <Input
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder="DELETE"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    className="max-w-xs"
                  />
                  <Button
                    variant="destructive"
                    onPress={() => void handleImport()}
                    disabled={!isConfirmed}
                    className="self-start"
                  >
                    <Icon as={FileUp} />
                    <Text>{t("admin.importButton")}</Text>
                  </Button>
                </View>
              )}

              {/* Importing state */}
              {state === "importing" && (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" />
                  <Text className="text-sm text-muted-foreground">{t("admin.importing")}</Text>
                </View>
              )}

              {/* Done state */}
              {state === "done" && (
                <Button variant="outline" onPress={handleReset} className="self-start">
                  {t("admin.selectFile")}
                </Button>
              )}
            </View>
          )}
        </CardContent>
      </Card>
    </Screen>
  );
}
