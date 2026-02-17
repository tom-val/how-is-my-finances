import type { Month, MonthDetail, CreateMonthRequest, UpdateMonthRequest } from "@shared/types/month";
import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export function getMonths(): Promise<Month[]> {
  return apiGet<Month[]>("/v1/months");
}

export function getMonth(id: string): Promise<MonthDetail> {
  return apiGet<MonthDetail>(`/v1/months/${id}`);
}

export function createMonth(request: CreateMonthRequest): Promise<Month> {
  return apiPost<Month>("/v1/months", request);
}

export function updateMonth(id: string, request: UpdateMonthRequest): Promise<Month> {
  return apiPut<Month>(`/v1/months/${id}`, request);
}

export function deleteMonth(id: string): Promise<void> {
  return apiDelete(`/v1/months/${id}`);
}
