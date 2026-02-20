export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isArchived: boolean;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  isArchived?: boolean;
}
