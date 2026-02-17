export interface Category {
  id: string;
  name: string | null;
  nameEn: string | null;
  nameLt: string | null;
  icon: string | null;
  isSystem: boolean;
  sortOrder: number;
}

export function getCategoryDisplayName(
  category: Category,
  language: string
): string {
  if (category.isSystem) {
    return language === "lt"
      ? (category.nameLt ?? category.nameEn ?? "")
      : (category.nameEn ?? category.nameLt ?? "");
  }
  return category.name ?? "";
}
