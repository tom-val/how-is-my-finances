export interface Expense {
  id: string;
  monthId: string;
  categoryId: string;
  itemName: string;
  amount: number;
  vendor: string | null;
  expenseDate: string;
  comment: string | null;
  isRecurringInstance: boolean;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseWithCategory extends Expense {
  categoryName: string;
  categoryIcon: string | null;
}

export interface CreateExpenseRequest {
  itemName: string;
  amount: number;
  categoryId: string;
  vendor?: string;
  expenseDate: string;
  comment?: string;
  isCompleted?: boolean;
}

export interface UpdateExpenseRequest {
  itemName?: string;
  amount?: number;
  categoryId?: string;
  vendor?: string;
  expenseDate?: string;
  comment?: string;
}
