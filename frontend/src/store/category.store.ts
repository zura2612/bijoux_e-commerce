// fichier frontend/src/store/category.store.ts
import { create } from 'zustand';
import { api } from '../utils/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

// Mapping slug → emoji pour les catégories connues
// Compléter si de nouvelles catégories avec emoji sont ajoutées
export const CATEGORY_EMOJIS: Record<string, string> = {
  'colliers':         '📿',
  'bracelets':        '💫',
  'boucles-oreilles': '✨',
  'bagues':           '💍',
};

interface CategoryState {
  categories: Category[];
  error: boolean;
  fetched: boolean;         // évite de refetcher si déjà chargé
  fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  error: false,
  fetched: false,

  fetchCategories: async () => {
    if (get().fetched) return;   // déjà chargé, pas de nouvel appel
    try {
      const { data } = await api.get('/catalog/categories');
      set({ categories: data.data, fetched: true, error: false });
    } catch {
      set({ error: true });
    }
  },
}));
