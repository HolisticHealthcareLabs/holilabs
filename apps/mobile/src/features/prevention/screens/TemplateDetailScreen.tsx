/**
 * Template Detail Screen (Overview Tab)
 * Features:
 * - Tabbed view (Overview, Versions, Comments)
 * - Editable fields with autosave
 * - Goal and recommendation management
 * - Share and collaboration options
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { Card, Button } from '@/components/ui';
import {
  useTemplate,
  useUpdateTemplate,
  useVersionHistory,
  useComments,
  useAddComment,
  useDeleteTemplate,
} from '../services/preventionApi';
import { PreventionTemplate, PreventionGoal, PreventionRecommendation } from '../types';
import { handleApiError } from '@/shared/services/api';

type TabType = 'overview' | 'versions' | 'comments';

export const TemplateDetailScreen = () => {
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { templateId } = route.params as { templateId: string };

  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<Partial<PreventionTemplate>>({});
  const [newComment, setNewComment] = useState('');

  // API queries
  const { data: template, isLoading, error } = useTemplate(templateId);
  const { data: versions } = useVersionHistory(templateId);
  const { data: comments } = useComments(templateId);

  // Mutations
  const updateTemplate = useUpdateTemplate(templateId);
  const addComment = useAddComment(templateId);
  const deleteTemplate = useDeleteTemplate();

  const handleEdit = () => {
    setIsEditing(true);
    setEditedTemplate(template || {});
  };

  const handleSave = async () => {
    try {
      await updateTemplate.mutateAsync(editedTemplate);
      setIsEditing(false);
      Alert.alert('Success', 'Template updated successfully');
    } catch (err) {
      Alert.alert('Error', handleApiError(err));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTemplate({});
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate.mutateAsync(templateId);
              navigation.goBack();
              Alert.alert('Success', 'Template deleted successfully');
            } catch (err) {
              Alert.alert('Error', handleApiError(err));
            }
          },
        },
      ]
    );
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment.mutateAsync({ content: newComment });
      setNewComment('');
      Alert.alert('Success', 'Comment added successfully');
    } catch (err) {
      Alert.alert('Error', handleApiError(err));
    }
  };

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'overview' && {
            borderBottomColor: theme.colors.primary,
            borderBottomWidth: 2,
          },
        ]}
        onPress={() => setActiveTab('overview')}
      >
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === 'overview' ? theme.colors.primary : theme.colors.textSecondary,
            },
          ]}
        >
          Overview
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'versions' && {
            borderBottomColor: theme.colors.primary,
            borderBottomWidth: 2,
          },
        ]}
        onPress={() => setActiveTab('versions')}
      >
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === 'versions' ? theme.colors.primary : theme.colors.textSecondary,
            },
          ]}
        >
          Versions ({versions?.count || 0})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'comments' && {
            borderBottomColor: theme.colors.primary,
            borderBottomWidth: 2,
          },
        ]}
        onPress={() => setActiveTab('comments')}
      >
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === 'comments' ? theme.colors.primary : theme.colors.textSecondary,
            },
          ]}
        >
          Comments ({comments?.count || 0})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOverviewTab = () => {
    if (!template) return null;

    const displayTemplate = isEditing ? editedTemplate : template;

    return (
      <View style={styles.tabContent}>
        {/* Header Actions */}
        <View style={styles.actions}>
          {!isEditing ? (
            <>
              <Button title="Edit" onPress={handleEdit} variant="primary" size="small" />
              <Button
                title="Delete"
                onPress={handleDelete}
                variant="secondary"
                size="small"
              />
            </>
          ) : (
            <>
              <Button
                title="Save"
                onPress={handleSave}
                variant="primary"
                size="small"
                disabled={updateTemplate.isPending}
              />
              <Button title="Cancel" onPress={handleCancel} variant="secondary" size="small" />
            </>
          )}
        </View>

        {/* Template Name */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Template Name
          </Text>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={displayTemplate.templateName}
              onChangeText={(text) =>
                setEditedTemplate({ ...editedTemplate, templateName: text })
              }
              placeholder="Enter template name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          ) : (
            <Text style={[styles.fieldValue, { color: theme.colors.text }]}>
              {displayTemplate.templateName}
            </Text>
          )}
        </Card>

        {/* Plan Type */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Plan Type</Text>
          <Text style={[styles.fieldValue, { color: theme.colors.text }]}>
            {displayTemplate.planType?.replace('_', ' ')}
          </Text>
        </Card>

        {/* Description */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Description
          </Text>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={displayTemplate.description}
              onChangeText={(text) =>
                setEditedTemplate({ ...editedTemplate, description: text })
              }
              placeholder="Enter description"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={[styles.fieldValue, { color: theme.colors.text }]}>
              {displayTemplate.description}
            </Text>
          )}
        </Card>

        {/* Guideline Source */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Guideline Source
          </Text>
          <Text style={[styles.fieldValue, { color: theme.colors.text }]}>
            {displayTemplate.guidelineSource}
          </Text>
        </Card>

        {/* Evidence Level */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Evidence Level
          </Text>
          <Text style={[styles.fieldValue, { color: theme.colors.text }]}>
            {displayTemplate.evidenceLevel}
          </Text>
        </Card>

        {/* Target Population */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Target Population
          </Text>
          <Text style={[styles.fieldValue, { color: theme.colors.text }]}>
            {displayTemplate.targetPopulation}
          </Text>
        </Card>

        {/* Goals */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Goals ({displayTemplate.goals?.length || 0})
          </Text>
          {displayTemplate.goals?.map((goal, index) => (
            <View key={index} style={styles.goalItem}>
              <Text style={[styles.goalText, { color: theme.colors.text }]}>
                {index + 1}. {goal.goal}
              </Text>
              <Text style={[styles.goalMeta, { color: theme.colors.textSecondary }]}>
                {goal.category} • {goal.timeframe} • {goal.priority}
              </Text>
            </View>
          ))}
        </Card>

        {/* Recommendations */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recommendations ({displayTemplate.recommendations?.length || 0})
          </Text>
          {displayTemplate.recommendations?.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={[styles.recTitle, { color: theme.colors.text }]}>
                {index + 1}. {rec.title}
              </Text>
              <Text style={[styles.recDescription, { color: theme.colors.textSecondary }]}>
                {rec.description}
              </Text>
              <Text style={[styles.recMeta, { color: theme.colors.textSecondary }]}>
                {rec.category} • {rec.priority}
              </Text>
            </View>
          ))}
        </Card>

        {/* Metadata */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Metadata</Text>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            Use Count: {displayTemplate.useCount}
          </Text>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            Created: {new Date(displayTemplate.createdAt || '').toLocaleDateString()}
          </Text>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            Updated: {new Date(displayTemplate.updatedAt || '').toLocaleDateString()}
          </Text>
        </Card>
      </View>
    );
  };

  const renderVersionsTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Version History</Text>
      {versions?.versions.map((version) => (
        <Card key={version.id} style={styles.versionCard}>
          <View style={styles.versionHeader}>
            <Text style={[styles.versionLabel, { color: theme.colors.text }]}>
              {version.versionLabel} (v{version.versionNumber})
            </Text>
            <Text style={[styles.versionDate, { color: theme.colors.textSecondary }]}>
              {new Date(version.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.versionChangeLog, { color: theme.colors.text }]}>
            {version.changeLog}
          </Text>
          <Text style={[styles.versionAuthor, { color: theme.colors.textSecondary }]}>
            By {version.createdByName}
          </Text>
        </Card>
      ))}
    </View>
  );

  const renderCommentsTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Comments</Text>

      {/* Add Comment */}
      <Card style={styles.commentInput}>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Add a comment..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={3}
        />
        <Button
          title="Post Comment"
          onPress={handleAddComment}
          variant="primary"
          size="small"
          disabled={!newComment.trim() || addComment.isPending}
        />
      </Card>

      {/* Comments List */}
      {comments?.comments.map((comment) => (
        <Card key={comment.id} style={styles.commentCard}>
          <View style={styles.commentHeader}>
            <Text style={[styles.commentAuthor, { color: theme.colors.text }]}>
              {comment.user.firstName} {comment.user.lastName}
            </Text>
            <Text style={[styles.commentDate, { color: theme.colors.textSecondary }]}>
              {new Date(comment.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.commentContent, { color: theme.colors.text }]}>
            {comment.content}
          </Text>
        </Card>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !template) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Error: {handleApiError(error)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderTabs()}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'versions' && renderVersionsTab()}
        {activeTab === 'comments' && renderCommentsTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  tabContent: {
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 24,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  goalItem: {
    marginBottom: 12,
  },
  goalText: {
    fontSize: 16,
    marginBottom: 4,
  },
  goalMeta: {
    fontSize: 14,
  },
  recommendationItem: {
    marginBottom: 16,
  },
  recTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  recMeta: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 14,
    marginBottom: 4,
  },
  versionCard: {
    padding: 16,
    marginBottom: 12,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  versionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  versionDate: {
    fontSize: 14,
  },
  versionChangeLog: {
    fontSize: 14,
    marginBottom: 4,
  },
  versionAuthor: {
    fontSize: 12,
  },
  commentInput: {
    padding: 16,
    marginBottom: 16,
  },
  commentCard: {
    padding: 16,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentDate: {
    fontSize: 12,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 16,
  },
});
