/**
 * Prevention Store - Zustand domain store for prevention plan templates
 *
 * Features:
 * - Template list management
 * - Template selection state
 * - Search and filter state
 * - Multi-select mode for bulk operations
 * - Offline-first with optimistic updates
 * - Integration with React Query for server sync
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PreventionTemplate,
  TemplateFilters,
  PreventionPlanType,
} from '@/features/prevention/types';

interface PreventionStore {
  // State
  templates: PreventionTemplate[];
  selectedTemplate: PreventionTemplate | null;
  filters: TemplateFilters;
  recentlyViewed: string[]; // Template IDs
  favorites: string[]; // Template IDs
  isLoading: boolean;
  error: string | null;

  // Multi-select mode for bulk operations
  isMultiSelectMode: boolean;
  selectedTemplateIds: string[];

  // Actions - Template Management
  setTemplates: (templates: PreventionTemplate[]) => void;
  addTemplate: (template: PreventionTemplate) => void;
  updateTemplate: (id: string, updates: Partial<PreventionTemplate>) => void;
  removeTemplate: (id: string) => void;

  // Actions - Selection
  selectTemplate: (template: PreventionTemplate | null) => void;
  selectTemplateById: (id: string) => void;

  // Actions - Multi-select Mode
  enableMultiSelectMode: () => void;
  disableMultiSelectMode: () => void;
  toggleTemplateSelection: (id: string) => void;
  selectAllTemplates: () => void;
  clearSelection: () => void;

  // Actions - Filters
  setSearchQuery: (query: string) => void;
  setPlanTypeFilter: (planType: TemplateFilters['planType']) => void;
  setIsActiveFilter: (isActive: boolean | null) => void;
  setSortBy: (sortBy: TemplateFilters['sortBy']) => void;
  setSortOrder: (sortOrder: TemplateFilters['sortOrder']) => void;
  resetFilters: () => void;

  // Actions - Recently Viewed & Favorites
  addToRecentlyViewed: (templateId: string) => void;
  toggleFavorite: (templateId: string) => void;
  clearRecentlyViewed: () => void;

  // Actions - Loading & Error
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed/Derived State (getters)
  getFilteredTemplates: () => PreventionTemplate[];
  getTemplateById: (id: string) => PreventionTemplate | undefined;
  getRecentlyViewedTemplates: () => PreventionTemplate[];
  getFavoriteTemplates: () => PreventionTemplate[];
  getSelectedTemplates: () => PreventionTemplate[];
}

const defaultFilters: TemplateFilters = {
  searchQuery: '',
  planType: 'ALL',
  isActive: null,
  sortBy: 'name',
  sortOrder: 'asc',
};

export const usePreventionStore = create<PreventionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      templates: [],
      selectedTemplate: null,
      filters: defaultFilters,
      recentlyViewed: [],
      favorites: [],
      isLoading: false,
      error: null,
      isMultiSelectMode: false,
      selectedTemplateIds: [],

      // Template Management
      setTemplates: (templates) => set({ templates }),

      addTemplate: (template) =>
        set((state) => ({
          templates: [template, ...state.templates],
        })),

      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
          selectedTemplate:
            state.selectedTemplate?.id === id
              ? { ...state.selectedTemplate, ...updates }
              : state.selectedTemplate,
        })),

      removeTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          selectedTemplate:
            state.selectedTemplate?.id === id ? null : state.selectedTemplate,
          recentlyViewed: state.recentlyViewed.filter((tid) => tid !== id),
          favorites: state.favorites.filter((tid) => tid !== id),
          selectedTemplateIds: state.selectedTemplateIds.filter((tid) => tid !== id),
        })),

      // Selection
      selectTemplate: (template) => {
        set({ selectedTemplate: template });
        if (template) {
          get().addToRecentlyViewed(template.id);
        }
      },

      selectTemplateById: (id) => {
        const template = get().getTemplateById(id);
        if (template) {
          get().selectTemplate(template);
        }
      },

      // Multi-select Mode
      enableMultiSelectMode: () =>
        set({
          isMultiSelectMode: true,
          selectedTemplateIds: [],
        }),

      disableMultiSelectMode: () =>
        set({
          isMultiSelectMode: false,
          selectedTemplateIds: [],
        }),

      toggleTemplateSelection: (id) =>
        set((state) => ({
          selectedTemplateIds: state.selectedTemplateIds.includes(id)
            ? state.selectedTemplateIds.filter((tid) => tid !== id)
            : [...state.selectedTemplateIds, id],
        })),

      selectAllTemplates: () =>
        set((state) => ({
          selectedTemplateIds: state.getFilteredTemplates().map((t) => t.id),
        })),

      clearSelection: () =>
        set({
          selectedTemplateIds: [],
        }),

      // Filters
      setSearchQuery: (query) =>
        set((state) => ({
          filters: { ...state.filters, searchQuery: query },
        })),

      setPlanTypeFilter: (planType) =>
        set((state) => ({
          filters: { ...state.filters, planType },
        })),

      setIsActiveFilter: (isActive) =>
        set((state) => ({
          filters: { ...state.filters, isActive },
        })),

      setSortBy: (sortBy) =>
        set((state) => ({
          filters: { ...state.filters, sortBy },
        })),

      setSortOrder: (sortOrder) =>
        set((state) => ({
          filters: { ...state.filters, sortOrder },
        })),

      resetFilters: () =>
        set({
          filters: defaultFilters,
        }),

      // Recently Viewed & Favorites
      addToRecentlyViewed: (templateId) =>
        set((state) => {
          const filtered = state.recentlyViewed.filter((id) => id !== templateId);
          return {
            recentlyViewed: [templateId, ...filtered].slice(0, 10), // Keep last 10
          };
        }),

      toggleFavorite: (templateId) =>
        set((state) => ({
          favorites: state.favorites.includes(templateId)
            ? state.favorites.filter((id) => id !== templateId)
            : [...state.favorites, templateId],
        })),

      clearRecentlyViewed: () => set({ recentlyViewed: [] }),

      // Loading & Error
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Getters
      getFilteredTemplates: () => {
        const { templates, filters } = get();
        let filtered = [...templates];

        // Search query
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (t) =>
              t.templateName.toLowerCase().includes(query) ||
              t.description.toLowerCase().includes(query) ||
              t.planType.toLowerCase().includes(query) ||
              t.guidelineSource.toLowerCase().includes(query) ||
              t.targetPopulation.toLowerCase().includes(query)
          );
        }

        // Plan type filter
        if (filters.planType !== 'ALL') {
          filtered = filtered.filter((t) => t.planType === filters.planType);
        }

        // Active status filter
        if (filters.isActive !== null) {
          filtered = filtered.filter((t) => t.isActive === filters.isActive);
        }

        // Sort
        filtered.sort((a, b) => {
          let compareValue = 0;

          switch (filters.sortBy) {
            case 'name':
              compareValue = a.templateName.localeCompare(b.templateName);
              break;
            case 'useCount':
              compareValue = a.useCount - b.useCount;
              break;
            case 'createdAt':
              compareValue =
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              break;
            case 'updatedAt':
              compareValue =
                new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
              break;
          }

          return filters.sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return filtered;
      },

      getTemplateById: (id) => {
        return get().templates.find((t) => t.id === id);
      },

      getRecentlyViewedTemplates: () => {
        const { templates, recentlyViewed } = get();
        return recentlyViewed
          .map((id) => templates.find((t) => t.id === id))
          .filter(Boolean) as PreventionTemplate[];
      },

      getFavoriteTemplates: () => {
        const { templates, favorites } = get();
        return favorites
          .map((id) => templates.find((t) => t.id === id))
          .filter(Boolean) as PreventionTemplate[];
      },

      getSelectedTemplates: () => {
        const { templates, selectedTemplateIds } = get();
        return selectedTemplateIds
          .map((id) => templates.find((t) => t.id === id))
          .filter(Boolean) as PreventionTemplate[];
      },
    }),
    {
      name: 'prevention-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data
      partialize: (state) => ({
        recentlyViewed: state.recentlyViewed,
        favorites: state.favorites,
        filters: state.filters,
      }),
    }
  )
);

// Selector hooks for performance optimization
export const useSelectedTemplate = () =>
  usePreventionStore((state) => state.selectedTemplate);

export const usePreventionFilters = () =>
  usePreventionStore((state) => state.filters);

export const useFilteredTemplates = () =>
  usePreventionStore((state) => state.getFilteredTemplates());

export const useFavoriteTemplates = () =>
  usePreventionStore((state) => state.getFavoriteTemplates());

export const useMultiSelectMode = () =>
  usePreventionStore((state) => ({
    isMultiSelectMode: state.isMultiSelectMode,
    selectedTemplateIds: state.selectedTemplateIds,
    selectedTemplates: state.getSelectedTemplates(),
  }));
