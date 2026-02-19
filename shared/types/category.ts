export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface UpdateCategoryRequest {
  name: string;
}
