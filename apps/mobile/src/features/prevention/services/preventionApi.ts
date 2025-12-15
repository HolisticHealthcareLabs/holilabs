/**
 * Prevention API Service
 * React Query hooks for all prevention-related API calls
 * Follows existing mobile app patterns and API reference documentation
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { api, handleApiError } from '@/shared/services/api';
import { API_CONFIG } from '@/config/api';
import {
  PreventionTemplate,
  TemplatesResponse,
  VersionsResponse,
  CommentsResponse,
  SharesResponse,
  RemindersResponse,
  TemplateVersion,
  TemplateComment,
  TemplateShare,
  BulkOperationResult,
  SharePermission,
  PreventionPlanType,
} from '../types';

// Query Keys
export const preventionKeys = {
  all: ['prevention'] as const,
  templates: () => [...preventionKeys.all, 'templates'] as const,
  template: (id: string) => [...preventionKeys.all, 'template', id] as const,
  versions: (templateId: string) => [...preventionKeys.all, 'versions', templateId] as const,
  version: (templateId: string, versionId: string) =>
    [...preventionKeys.all, 'version', templateId, versionId] as const,
  comments: (templateId: string) => [...preventionKeys.all, 'comments', templateId] as const,
  shares: (templateId: string) => [...preventionKeys.all, 'shares', templateId] as const,
  sharedWithMe: () => [...preventionKeys.all, 'sharedWithMe'] as const,
  reminders: (planId: string) => [...preventionKeys.all, 'reminders', planId] as const,
};

// ========================
// TEMPLATES - QUERIES
// ========================

interface UseTemplatesParams {
  planType?: PreventionPlanType;
  isActive?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

export function useTemplates(
  params?: UseTemplatesParams,
  options?: Omit<UseQueryOptions<TemplatesResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TemplatesResponse>({
    queryKey: [...preventionKeys.templates(), params],
    queryFn: () => api.get(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATES, params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useTemplate(
  templateId: string,
  options?: Omit<UseQueryOptions<PreventionTemplate>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PreventionTemplate>({
    queryKey: preventionKeys.template(templateId),
    queryFn: () => api.get(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_BY_ID(templateId)),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useVersionHistory(
  templateId: string,
  options?: Omit<UseQueryOptions<VersionsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VersionsResponse>({
    queryKey: preventionKeys.versions(templateId),
    queryFn: () => api.get(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_VERSIONS(templateId)),
    enabled: !!templateId,
    ...options,
  });
}

export function useTemplateVersion(
  templateId: string,
  versionId: string,
  options?: Omit<UseQueryOptions<TemplateVersion>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TemplateVersion>({
    queryKey: preventionKeys.version(templateId, versionId),
    queryFn: () =>
      api.get(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_VERSION_BY_ID(templateId, versionId)),
    enabled: !!templateId && !!versionId,
    ...options,
  });
}

export function useComments(
  templateId: string,
  options?: Omit<UseQueryOptions<CommentsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CommentsResponse>({
    queryKey: preventionKeys.comments(templateId),
    queryFn: () => api.get(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_COMMENTS(templateId)),
    enabled: !!templateId,
    ...options,
  });
}

export function useShares(
  templateId: string,
  options?: Omit<UseQueryOptions<SharesResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SharesResponse>({
    queryKey: preventionKeys.shares(templateId),
    queryFn: () => api.get(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_SHARES(templateId)),
    enabled: !!templateId,
    ...options,
  });
}

export function useSharedWithMe(
  options?: Omit<UseQueryOptions<TemplatesResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TemplatesResponse>({
    queryKey: preventionKeys.sharedWithMe(),
    queryFn: () => api.get(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATES_SHARED_WITH_ME),
    ...options,
  });
}

export function useReminders(
  planId: string,
  options?: Omit<UseQueryOptions<RemindersResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<RemindersResponse>({
    queryKey: preventionKeys.reminders(planId),
    queryFn: () => api.get(API_CONFIG.ENDPOINTS.PREVENTION_PLAN_REMINDERS(planId)),
    enabled: !!planId,
    ...options,
  });
}

// ========================
// TEMPLATES - MUTATIONS
// ========================

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<PreventionTemplate>) =>
      api.post<PreventionTemplate>(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATES, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.templates() });
    },
  });
}

export function useUpdateTemplate(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<PreventionTemplate>) =>
      api.put<PreventionTemplate>(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_BY_ID(templateId),
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.templates() });
      queryClient.invalidateQueries({ queryKey: preventionKeys.template(templateId) });
      queryClient.invalidateQueries({ queryKey: preventionKeys.versions(templateId) });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_BY_ID(templateId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.templates() });
    },
  });
}

// ========================
// COMMENTS - MUTATIONS
// ========================

export function useAddComment(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string; mentions?: string[] }) =>
      api.post<TemplateComment>(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_COMMENTS(templateId),
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.comments(templateId) });
    },
  });
}

export function useUpdateComment(templateId: string, commentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string; mentions?: string[] }) =>
      api.put<TemplateComment>(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_COMMENT_BY_ID(templateId, commentId),
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.comments(templateId) });
    },
  });
}

export function useDeleteComment(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_COMMENT_BY_ID(templateId, commentId)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.comments(templateId) });
    },
  });
}

// ========================
// SHARING - MUTATIONS
// ========================

export function useShareTemplate(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      userId: string;
      permission: SharePermission;
      message?: string;
      expiresAt?: string;
    }) =>
      api.post<TemplateShare>(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_SHARES(templateId),
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.shares(templateId) });
    },
  });
}

export function useUpdateSharePermission(templateId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { permission: SharePermission }) =>
      api.put<TemplateShare>(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_SHARE_BY_USER(templateId, userId),
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.shares(templateId) });
    },
  });
}

export function useRevokeShare(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`${API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_SHARES(templateId)}?userId=${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.shares(templateId) });
    },
  });
}

// ========================
// VERSION CONTROL
// ========================

export function useRevertToVersion(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { versionId: string; createSnapshot?: boolean }) =>
      api.post(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_REVERT(templateId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.template(templateId) });
      queryClient.invalidateQueries({ queryKey: preventionKeys.versions(templateId) });
      queryClient.invalidateQueries({ queryKey: preventionKeys.templates() });
    },
  });
}

export function useCompareVersions(templateId: string) {
  return useMutation({
    mutationFn: (data: { versionId1: string; versionId2: string }) =>
      api.post(API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATE_COMPARE(templateId), data),
  });
}

// ========================
// BULK OPERATIONS
// ========================

export function useBulkActivate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateIds: string[]) =>
      api.post<BulkOperationResult>(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATES_BULK_ACTIVATE,
        { templateIds }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.templates() });
    },
  });
}

export function useBulkDeactivate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateIds: string[]) =>
      api.post<BulkOperationResult>(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATES_BULK_DEACTIVATE,
        { templateIds }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.templates() });
    },
  });
}

export function useBulkDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateIds: string[]) =>
      api.post<BulkOperationResult>(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATES_BULK_DELETE,
        { templateIds }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.templates() });
    },
  });
}

export function useBulkDuplicate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateIds: string[]) =>
      api.post<BulkOperationResult>(
        API_CONFIG.ENDPOINTS.PREVENTION_TEMPLATES_BULK_DUPLICATE,
        { templateIds }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.templates() });
    },
  });
}

// ========================
// REMINDERS
// ========================

export function useAutoGenerateReminders(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post(API_CONFIG.ENDPOINTS.PREVENTION_PLAN_AUTO_GENERATE_REMINDERS(planId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preventionKeys.reminders(planId) });
    },
  });
}
