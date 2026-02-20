export interface Profile {
  id: string;
  displayName: string | null;
  preferredLanguage: string;
  preferredCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  preferredLanguage?: string;
  preferredCurrency?: string;
}
