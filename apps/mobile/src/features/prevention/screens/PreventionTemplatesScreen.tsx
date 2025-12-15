/**
 * Prevention Templates Screen (Main Hub)
 * Features:
 * - Template list with pull-to-refresh
 * - Search and filters
 * - Swipe actions (edit, delete, duplicate)
 * - Multi-select mode for bulk operations
 * - Favorites and recently viewed
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Card, Button } from '@/components/ui';
import { useTemplates, useBulkDelete, useBulkActivate, useBulkDeactivate } from '../services/preventionApi';
import { usePreventionStore, useFilteredTemplates, useMultiSelectMode } from '@/stores/preventionStore';
import { PreventionTemplate, PreventionPlanType } from '../types';
import { handleApiError } from '@/shared/services/api';

export const PreventionTemplatesScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  // Store state
  const filters = usePreventionStore((state) => state.filters);
  const setSearchQuery = usePreventionStore((state) => state.setSearchQuery);
  const setPlanTypeFilter = usePreventionStore((state) => state.setPlanTypeFilter);
  const setIsActiveFilter = usePreventionStore((state) => state.setIsActiveFilter);
  const toggleFavorite = usePreventionStore((state) => state.toggleFavorite);
  const favorites = usePreventionStore((state) => state.favorites);
  const enableMultiSelectMode = usePreventionStore((state) => state.enableMultiSelectMode);
  const disableMultiSelectMode = usePreventionStore((state) => state.disableMultiSelectMode);
  const toggleTemplateSelection = usePreventionStore((state) => state.toggleTemplateSelection);
  const selectAllTemplates = usePreventionStore((state) => state.selectAllTemplates);
  const clearSelection = usePreventionStore((state) => state.clearSelection);

  const { isMultiSelectMode, selectedTemplateIds } = useMultiSelectMode();

  // API queries
  const { data, isLoading, error, refetch } = useTemplates({
    planType: filters.planType !== 'ALL' ? filters.planType : undefined,
    isActive: filters.isActive !== null ? filters.isActive : undefined,
    search: filters.searchQuery || undefined,
  });

  // Bulk operations
  const bulkDelete = useBulkDelete();
  const bulkActivate = useBulkActivate();
  const bulkDeactivate = useBulkDeactivate();

  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleTemplatePress = (template: PreventionTemplate) => {
    if (isMultiSelectMode) {
      toggleTemplateSelection(template.id);
    } else {
      // Navigate to detail screen
      navigation.navigate('TemplateDetail' as never, { templateId: template.id } as never);
    }
  };

  const handleLongPress = (template: PreventionTemplate) => {
    if (!isMultiSelectMode) {
      enableMultiSelectMode();
      toggleTemplateSelection(template.id);
    }
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Delete Templates',
      `Are you sure you want to delete ${selectedTemplateIds.length} template(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bulkDelete.mutateAsync(selectedTemplateIds);
              disableMultiSelectMode();
              Alert.alert('Success', 'Templates deleted successfully');
            } catch (err) {
              Alert.alert('Error', handleApiError(err));
            }
          },
        },
      ]
    );
  };

  const handleBulkActivate = async () => {
    try {
      await bulkActivate.mutateAsync(selectedTemplateIds);
      disableMultiSelectMode();
      Alert.alert('Success', 'Templates activated successfully');
    } catch (err) {
      Alert.alert('Error', handleApiError(err));
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      await bulkDeactivate.mutateAsync(selectedTemplateIds);
      disableMultiSelectMode();
      Alert.alert('Success', 'Templates deactivated successfully');
    } catch (err) {
      Alert.alert('Error', handleApiError(err));
    }
  };

  const renderTemplate = ({ item }: { item: PreventionTemplate }) => {
    const isFavorite = favorites.includes(item.id);
    const isSelected = selectedTemplateIds.includes(item.id);

    return (
      <TouchableOpacity
        onPress={() => handleTemplatePress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <Card
          style={[
            styles.templateCard,
            isSelected && { backgroundColor: theme.colors.primary + '20' },
          ]}
        >
          <View style={styles.templateHeader}>
            <View style={styles.templateTitleRow}>
              {isMultiSelectMode && (
                <Text style={styles.checkbox}>{isSelected ? '☑' : '☐'}</Text>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.templateName, { color: theme.colors.text }]}>
                  {item.templateName}
                </Text>
                <Text style={[styles.planType, { color: theme.colors.textSecondary }]}>
                  {item.planType.replace('_', ' ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                <Text style={styles.favoriteIcon}>{isFavorite ? '★' : '☆'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>

          <View style={styles.templateFooter}>
            <View style={styles.metaInfo}>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {item.guidelineSource} • {item.evidenceLevel}
              </Text>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                Used {item.useCount} times
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: item.isActive
                    ? theme.colors.success + '20'
                    : theme.colors.error + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: item.isActive ? theme.colors.success : theme.colors.error },
                ]}
              >
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {isMultiSelectMode ? `${selectedTemplateIds.length} Selected` : 'Prevention Templates'}
        </Text>
        {isMultiSelectMode && (
          <Button
            title="Cancel"
            onPress={disableMultiSelectMode}
            variant="secondary"
            size="small"
          />
        )}
      </View>

      {/* Search Bar */}
      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: theme.colors.card,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        placeholder="Search templates..."
        placeholderTextColor={theme.colors.textSecondary}
        value={filters.searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Quick Filters */}
      <View style={styles.quickFilters}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filters.isActive === true ? theme.colors.primary : theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() =>
            setIsActiveFilter(filters.isActive === true ? null : true)
          }
        >
          <Text
            style={[
              styles.filterChipText,
              { color: filters.isActive === true ? '#fff' : theme.colors.text },
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filters.isActive === false ? theme.colors.primary : theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() =>
            setIsActiveFilter(filters.isActive === false ? null : false)
          }
        >
          <Text
            style={[
              styles.filterChipText,
              { color: filters.isActive === false ? '#fff' : theme.colors.text },
            ]}
          >
            Inactive
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={[styles.filterChipText, { color: theme.colors.text }]}>More Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Bulk Actions */}
      {isMultiSelectMode && selectedTemplateIds.length > 0 && (
        <View style={styles.bulkActions}>
          <Button
            title="Activate"
            onPress={handleBulkActivate}
            variant="primary"
            size="small"
          />
          <Button
            title="Deactivate"
            onPress={handleBulkDeactivate}
            variant="secondary"
            size="small"
          />
          <Button
            title="Delete"
            onPress={handleBulkDelete}
            variant="secondary"
            size="small"
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isLoading && !data ? (
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Loading templates...
        </Text>
      ) : error ? (
        <Text style={[styles.emptyText, { color: theme.colors.error }]}>
          Error: {handleApiError(error)}
        </Text>
      ) : data && data.templates.length > 0 ? (
        <FlatList
          data={data.templates}
          renderItem={renderTemplate}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      ) : (
        <View>
          {renderHeader()}
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No templates found
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  searchInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  templateCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  templateHeader: {
    marginBottom: 8,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    fontSize: 24,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  planType: {
    fontSize: 14,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  favoriteIcon: {
    fontSize: 24,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 16,
  },
});
