import type { Profile, UpdateProfileRequest } from "@shared/types/profile";
import { apiGet, apiPut } from "./client";

export function getProfile(): Promise<Profile> {
  return apiGet<Profile>("/v1/profile");
}

export function updateProfile(
  request: UpdateProfileRequest,
): Promise<Profile> {
  return apiPut<Profile>("/v1/profile", request);
}
