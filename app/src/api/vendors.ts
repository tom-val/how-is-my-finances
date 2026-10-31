import type { UserVendor, ToggleVendorRequest } from "@shared/types/vendor";
import { apiGet, apiPatch } from "./client";

export function getVendors(): Promise<UserVendor[]> {
  return apiGet<UserVendor[]>("/v1/vendors");
}

export function getVisibleVendors(): Promise<UserVendor[]> {
  return apiGet<UserVendor[]>("/v1/vendors/visible");
}

export function toggleVendorHidden(
  id: string,
  request: ToggleVendorRequest,
): Promise<UserVendor> {
  return apiPatch<UserVendor>(`/v1/vendors/${id}`, request);
}
