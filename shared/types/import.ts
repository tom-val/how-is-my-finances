export interface ImportExpense {
  itemName: string;
  amount: number;
  categoryName: string;
  vendor?: string;
  expenseDate: string;
  comment?: string;
}

export interface ImportIncome {
  source: string;
  amount: number;
  incomeDate: string;
  comment?: string;
}

export interface ImportMonth {
  year: number;
  month: number;
  salary: number;
  expenses: ImportExpense[];
  incomes: ImportIncome[];
}

export interface ImportRequest {
  categories: string[];
  months: ImportMonth[];
}

export interface ImportResult {
  categoriesCreated: number;
  monthsCreated: number;
  expensesCreated: number;
  incomesCreated: number;
}
