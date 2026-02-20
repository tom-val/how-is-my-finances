export interface UserVendor {
  id: string;
  name: string;
  isHidden: boolean;
}

export interface ToggleVendorRequest {
  isHidden: boolean;
}
