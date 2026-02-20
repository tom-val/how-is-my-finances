import { apiGet, apiPut } from "./client";

export function getHiddenVendors(): Promise<string[]> {
  return apiGet<string[]>("/v1/vendors/hidden");
}

export function setHiddenVendors(vendors: string[]): Promise<string[]> {
  return apiPut<string[]>("/v1/vendors/hidden", { vendors });
}
