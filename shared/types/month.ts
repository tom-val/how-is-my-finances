export interface Month {
  id: string;
  userId: string;
  year: number;
  monthNumber: number;
  salary: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthSummary extends Month {
  totalSpent: number;
  totalIncome: number;
  remaining: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  total: number;
}

export interface MonthDetail extends Month {
  totalSpent: number;
  plannedSpent: number;
  totalIncome: number;
  remaining: number;
  categoryBreakdown: CategoryBreakdownItem[];
  daysRemaining: number;
}

export interface CreateMonthRequest {
  year: number;
  month: number;
  salary: number;
}

export interface UpdateMonthRequest {
  salary?: number;
  notes?: string;
}
