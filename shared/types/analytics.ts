export interface AnalyticsResponse {
  categoryTotals: CategoryTotal[];
  vendorTotals: VendorTotal[];
  topExpenses: ExpenseSummary[];
}

export interface ExpenseSummary {
  id: string;
  itemName: string;
  amount: number;
  vendor: string | null;
  categoryName: string;
  expenseDate: string;
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
