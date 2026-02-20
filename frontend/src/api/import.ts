import type { ImportRequest, ImportResult } from "@shared/types/import";
import { apiPost } from "./client";

export function importData(request: ImportRequest): Promise<ImportResult> {
  return apiPost<ImportResult>("/v1/import", request);
}
