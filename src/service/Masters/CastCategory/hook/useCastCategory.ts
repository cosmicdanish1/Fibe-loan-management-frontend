// hook/useCastCategory.ts

import { useState, useCallback, useEffect } from 'react';
import { CastCategoryData, CastCategoryHookReturn } from '../interface/CastCategoryInterfaces';
import { apiService } from '../../../../services/api';

const notify = async (type: 'info' | 'warning' | 'error', title: string, msg: string, detail: string) => {
    if ((window as any).electronAPI?.showMessageBox) {
        await (window as any).electronAPI.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
    } else {
        alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`);
    }
};

export const useCastCategory = (): CastCategoryHookReturn => {
    const [categories, setCategories] = useState<CastCategoryData[]>([]);
    const [data, setData] = useState<CastCategoryData>({
        categoryCode: '',
        categoryName: '',
    });

    // Next free numeric code = max(existing) + 1 (codes are numeric ids).
    const nextCode = useCallback((list: CastCategoryData[]): string => {
        const max = list.reduce((m, c) => Math.max(m, parseInt(c.categoryCode, 10) || 0), 0);
        return String(max + 1);
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await apiService.getCastCategories();
            if (response.success && response.data) {
                const raw = Array.isArray(response.data) ? response.data : [];
                const mapped = raw.map((item: any) => ({
                    categoryCode: item.id.toString(),
                    categoryName: item.name || item.castcategory || ''
                }));
                setCategories(mapped);
                // Pre-fill the next code for a fresh entry (don't clobber an in-progress edit).
                setData(prev => (prev.categoryCode ? prev : { ...prev, categoryCode: nextCode(mapped) }));
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            notify('error', 'Load Error', 'Failed to Load Categories', 'Could not retrieve category list. Please refresh and try again.');
        }
    }, [nextCode]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const updateCategoryCode = (value: string) => {
        // Codes are numeric ids — strip anything else.
        setData((prev) => ({ ...prev, categoryCode: value.replace(/[^0-9]/g, '') }));
    };

    const updateCategoryName = (value: string) => {
        setData((prev) => ({ ...prev, categoryName: value }));
    };

    const save = async () => {
        if (!data.categoryCode || !data.categoryName) {
            await notify('warning', 'Input Validation Error', 'Code and Name Required', 'Please enter both Category Code and Category Name before saving.');
            return;
        }

        const id = parseInt(data.categoryCode, 10);
        if (isNaN(id)) {
            await notify('warning', 'Input Validation Error', 'Invalid Category Code', 'Category Code must be a numeric value.');
            return;
        }

        try {
            const exists = categories.find((c) => c.categoryCode === data.categoryCode);

            if (exists) {
                const response = await apiService.updateCastCategory(id, { name: data.categoryName });
                if (response.success) {
                    await notify('info', 'electron-react-ts', 'Cast Category Updated!',
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `CODE   : ${data.categoryCode}\n` +
                        `NAME   : ${data.categoryName}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `✓ Updated in cast_category`
                    );
                    fetchCategories();
                    reset();
                } else {
                    await notify('error', 'Category Error', 'Failed to Update Category', response.message || 'An unexpected error occurred.');
                }
            } else {
                const response = await apiService.createCastCategory({ id, name: data.categoryName });
                if (response.success) {
                    await notify('info', 'electron-react-ts', 'Cast Category Created!',
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `CODE   : ${data.categoryCode}\n` +
                        `NAME   : ${data.categoryName}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `✓ Saved to cast_category`
                    );
                    fetchCategories();
                    reset();
                } else {
                    await notify('error', 'Category Error', 'Failed to Create Category', response.message || 'An unexpected error occurred.');
                }
            }
        } catch (error: any) {
            await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
        }
    };

    const reset = () => {
        // Blank; fetchCategories re-prefills the next code from the fresh list.
        setData({ categoryCode: '', categoryName: '' });
    };

    const deleteCategory = async (code: string) => {
        const id = parseInt(code, 10);
        const cat = categories.find(c => c.categoryCode === code);

        // Confirm before deleting — this removes a master record other data may reference.
        const eAPI = (window as any).electronAPI;
        if (eAPI?.showMessageBox) {
            const res = await eAPI.showMessageBox({
                type: 'warning',
                title: 'Confirm Delete',
                message: `Delete category "${cat?.categoryName || code}"?`,
                detail: 'This permanently removes the category from cast_category. Members already assigned to it are not changed.',
                buttons: ['Cancel', 'Delete'],
                defaultId: 0,
                cancelId: 0,
            });
            if (res?.response !== 1) return;
        } else if (!window.confirm(`Delete category "${cat?.categoryName || code}"?`)) {
            return;
        }

        try {
            const response = await apiService.deleteCastCategory(id);
            if (response.success) {
                await notify('info', 'electron-react-ts', 'Category Deleted', `Category code ${code} has been removed from cast_category.`);
                fetchCategories();
            } else {
                await notify('error', 'Delete Error', 'Failed to Delete Category', response.message || 'An unexpected error occurred.');
            }
        } catch (error: any) {
            await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
        }
    };

    const editCategory = (category: CastCategoryData) => {
        setData(category);
    };

    return {
        data,
        categories,
        updateCategoryCode,
        updateCategoryName,
        save,
        reset,
        deleteCategory,
        editCategory,
    };
};
