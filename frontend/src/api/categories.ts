import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@shared/types/category";
import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export function getCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/v1/categories");
}

export function createCategory(
  request: CreateCategoryRequest,
): Promise<Category> {
  return apiPost<Category>("/v1/categories", request);
}

export function updateCategory(
  id: string,
  request: UpdateCategoryRequest,
): Promise<Category> {
  return apiPut<Category>(`/v1/categories/${id}`, request);
}

export function deleteCategory(id: string): Promise<void> {
  return apiDelete(`/v1/categories/${id}`);
}
