import { apiDelete } from "./client";

/** Permanently deletes the signed-in user's account and all their data. */
export function deleteAccount(): Promise<void> {
  return apiDelete("/v1/account");
}
