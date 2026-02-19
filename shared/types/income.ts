export interface Income {
  id: string;
  userId: string;
  monthId: string;
  source: string;
  amount: number;
  incomeDate: string;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeRequest {
  source: string;
  amount: number;
  incomeDate: string;
  comment?: string;
}

export interface UpdateIncomeRequest {
  source?: string;
  amount?: number;
  incomeDate?: string;
  comment?: string;
}
