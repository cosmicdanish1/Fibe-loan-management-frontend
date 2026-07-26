// interface/CastCategoryInterfaces.ts

export interface CastCategoryData {
    categoryCode: string;
    categoryName: string;
}

export interface CastCategoryHookReturn {
    data: CastCategoryData;
    categories: CastCategoryData[];
    updateCategoryCode: (value: string) => void;
    updateCategoryName: (value: string) => void;
    save: () => void;
    reset: () => void;
    deleteCategory: (code: string) => void;
    editCategory: (category: CastCategoryData) => void;
}
