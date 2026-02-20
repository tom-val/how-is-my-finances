export interface AnalyticsResponse {
  categoryTotals: CategoryTotal[];
  vendorTotals: VendorTotal[];
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  total: number;
}

export interface VendorTotal {
  vendor: string;
  total: number;
  count: number;
}
