import type { Category } from "@shared/types/category";
import { apiGet } from "./client";

export function getCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/v1/categories");
}
