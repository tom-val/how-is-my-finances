export interface RecurringExpense {
  id: string;
  categoryId: string;
  itemName: string;
  amount: number;
  vendor: string | null;
  comment: string | null;
  dayOfMonth: number;
  isActive: boolean;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpenseWithCategory extends RecurringExpense {
  categoryName: string;
  categoryIcon: string | null;
}

export interface CreateRecurringExpenseRequest {
  itemName: string;
  amount: number;
  categoryId: string;
  vendor?: string;
  comment?: string;
  dayOfMonth: number;
  isManual?: boolean;
}

export interface UpdateRecurringExpenseRequest {
  itemName?: string;
  amount?: number;
  categoryId?: string;
  vendor?: string;
  comment?: string;
  dayOfMonth?: number;
  isActive?: boolean;
  isManual?: boolean;
}
