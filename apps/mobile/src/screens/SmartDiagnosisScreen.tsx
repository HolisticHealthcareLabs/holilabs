/**
 * Smart Diagnosis Screen - Mobile
 * AI-powered diagnostic assistant with EHR integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface Symptom {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
}

interface DiagnosisSuggestion {
  id: string;
  condition: string;
  probability: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendedTests: string[];
  urgency: 'routine' | 'urgent' | 'emergency';
}

interface LabResult {
  testName: string;
  value: string;
  status: 'normal' | 'abnormal' | 'critical';
  date: Date;
}

interface AIInsight {
  id: string;
  type: 'observation' | 'recommendation' | 'warning';
  message: string;
  confidence: number;
}

export const SmartDiagnosisScreen: React.FC = () => {
  const { theme } = useTheme();
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisSuggestion[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ehrAccessGranted, setEhrAccessGranted] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'input' | 'diagnosis' | 'labs' | 'insights'>(
    'input'
  );

  useEffect(() => {
    // Simulate EHR access check
    setEhrAccessGranted(true);
    loadPatientLabResults();
  }, []);

  const loadPatientLabResults = () => {
    // Mock lab results from EHR
    setLabResults([
      {
        testName: 'Hemoglobin A1c',
        value: '6.8%',
        status: 'abnormal',
        date: new Date('2024-01-15'),
      },
      {
        testName: 'Total Cholesterol',
        value: '195 mg/dL',
        status: 'normal',
        date: new Date('2024-01-15'),
      },
      {
        testName: 'LDL Cholesterol',
        value: '122 mg/dL',
        status: 'abnormal',
        date: new Date('2024-01-15'),
      },
      {
        testName: 'Blood Pressure',
        value: '140/90 mmHg',
        status: 'abnormal',
        date: new Date('2024-01-20'),
      },
    ]);
  };

  const addSymptom = (name: string) => {
    const newSymptom: Symptom = {
      id: Date.now().toString(),
      name,
      severity: 'moderate',
      duration: 'Recent',
    };
    setSymptoms([...symptoms, newSymptom]);
  };

  const removeSymptom = (id: string) => {
    setSymptoms(symptoms.filter((s) => s.id !== id));
  };

  const analyzeDiagnosis = async () => {
    if (!chiefComplaint && symptoms.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    setSelectedTab('diagnosis');

    // Simulate AI analysis
    setTimeout(() => {
      // Generate diagnosis suggestions
      const mockDiagnoses: DiagnosisSuggestion[] = [
        {
          id: '1',
          condition: 'Acute Coronary Syndrome (ACS)',
          probability: 0.78,
          severity: 'high',
          description:
            'Given chest pain, elevated blood pressure, and abnormal lipid profile, ACS should be ruled out urgently.',
          recommendedTests: [
            'ECG (12-lead)',
            'Troponin levels',
            'Cardiac enzyme panel',
            'Chest X-ray',
          ],
          urgency: 'urgent',
        },
        {
          id: '2',
          condition: 'Stable Angina',
          probability: 0.65,
          severity: 'medium',
          description:
            'Chest pain pattern consistent with stable angina. Consider stress test and cardiac imaging.',
          recommendedTests: [
            'Exercise stress test',
            'Echocardiogram',
            'Coronary CT angiography',
          ],
          urgency: 'routine',
        },
        {
          id: '3',
          condition: 'Gastroesophageal Reflux Disease (GERD)',
          probability: 0.42,
          severity: 'low',
          description:
            'Chest discomfort may be related to GERD, especially if associated with meals or lying down.',
          recommendedTests: ['Upper endoscopy', 'Esophageal pH monitoring'],
          urgency: 'routine',
        },
      ];

      setDiagnoses(mockDiagnoses);

      // Generate AI insights
      const mockInsights: AIInsight[] = [
        {
          id: '1',
          type: 'warning',
          message:
            'Patient has elevated cardiovascular risk factors: hypertension, dyslipidemia, elevated HbA1c.',
          confidence: 0.95,
        },
        {
          id: '2',
          type: 'recommendation',
          message:
            'Immediate ECG and troponin levels recommended to rule out acute coronary syndrome.',
          confidence: 0.88,
        },
        {
          id: '3',
          type: 'observation',
          message:
            'Patient\'s HbA1c of 6.8% indicates prediabetes. Consider glucose tolerance test.',
          confidence: 0.92,
        },
        {
          id: '4',
          type: 'recommendation',
          message:
            'Based on ASCVD risk score, patient may benefit from statin therapy. Consider lipid panel follow-up.',
          confidence: 0.85,
        },
      ];

      setInsights(mockInsights);
      setIsAnalyzing(false);
    }, 2500);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return theme.colors.error;
      case 'urgent':
        return theme.colors.warning;
      case 'routine':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return theme.colors.error;
      case 'medium':
        return theme.colors.warning;
      case 'low':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning':
        return theme.colors.error;
      case 'recommendation':
        return theme.colors.info;
      case 'observation':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'recommendation':
        return '💡';
      case 'observation':
        return '👁️';
      default:
        return 'ℹ️';
    }
  };

  const styles = createStyles(theme);

  const renderInputTab = () => (
    <>
      {/* EHR Access Status */}
      <Card style={styles.ehrCard}>
        <View style={styles.ehrHeader}>
          <Text style={styles.ehrIcon}>
            {ehrAccessGranted ? '✅' : '🔒'}
          </Text>
          <View style={styles.ehrInfo}>
            <Text style={styles.ehrTitle}>
              {ehrAccessGranted ? 'EHR Access Granted' : 'EHR Access Required'}
            </Text>
            <Text style={styles.ehrDescription}>
              {ehrAccessGranted
                ? 'AI can analyze patient lab results and medical history'
                : 'Grant access to enable comprehensive analysis'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Chief Complaint */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Chief Complaint</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the patient's main concern..."
          placeholderTextColor={theme.colors.textTertiary}
          value={chiefComplaint}
          onChangeText={setChiefComplaint}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </Card>

      {/* Symptoms */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Key Symptoms</Text>
        <View style={styles.symptomsList}>
          {symptoms.map((symptom) => (
            <View key={symptom.id} style={styles.symptomChip}>
              <Text style={styles.symptomText}>{symptom.name}</Text>
              <TouchableOpacity
                onPress={() => removeSymptom(symptom.id)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Text style={styles.symptomRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Quick symptom buttons */}
        <View style={styles.quickSymptoms}>
          {['Chest Pain', 'Shortness of Breath', 'Fatigue', 'Dizziness', 'Nausea'].map(
            (symptom) => (
              <TouchableOpacity
                key={symptom}
                style={styles.quickSymptomButton}
                onPress={() => addSymptom(symptom)}
              >
                <Text style={styles.quickSymptomText}>+ {symptom}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </Card>

      {/* Analyze Button */}
      <Button
        title="Analyze with AI"
        onPress={analyzeDiagnosis}
        variant="primary"
        size="lg"
        fullWidth
        loading={isAnalyzing}
        disabled={!chiefComplaint && symptoms.length === 0}
        style={styles.analyzeButton}
      />
    </>
  );

  const renderDiagnosisTab = () => (
    <>
      {isAnalyzing ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing with AI...</Text>
          <Text style={styles.loadingSubtext}>
            Reviewing symptoms, lab results, and medical history
          </Text>
        </Card>
      ) : diagnoses.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🤖</Text>
          <Text style={styles.emptyTitle}>No Diagnosis Yet</Text>
          <Text style={styles.emptyText}>
            Enter chief complaint and symptoms to get AI-powered diagnosis suggestions
          </Text>
        </Card>
      ) : (
        diagnoses.map((diagnosis, index) => (
          <Card key={diagnosis.id} style={styles.diagnosisCard}>
            <View style={styles.diagnosisHeader}>
              <View style={styles.diagnosisRank}>
                <Text style={styles.diagnosisRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.diagnosisTitleSection}>
                <Text style={styles.diagnosisTitle}>{diagnosis.condition}</Text>
                <View style={styles.diagnosisMetrics}>
                  <View
                    style={[
                      styles.probabilityBadge,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Text style={[styles.probabilityText, { color: theme.colors.primary }]}>
                      {Math.round(diagnosis.probability * 100)}% match
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.urgencyBadge,
                      {
                        backgroundColor:
                          getUrgencyColor(diagnosis.urgency) + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.urgencyText,
                        { color: getUrgencyColor(diagnosis.urgency) },
                      ]}
                    >
                      {diagnosis.urgency}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.diagnosisDescription}>{diagnosis.description}</Text>

            <View style={styles.testsSection}>
              <Text style={styles.testsTitle}>Recommended Tests:</Text>
              {diagnosis.recommendedTests.map((test, idx) => (
                <View key={idx} style={styles.testItem}>
                  <Text style={styles.testBullet}>•</Text>
                  <Text style={styles.testText}>{test}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))
      )}
    </>
  );

  const renderLabsTab = () => (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Recent Lab Results</Text>
      <Text style={styles.sectionSubtitle}>From patient's EHR</Text>

      {labResults.map((result, index) => (
        <View key={index} style={styles.labResultItem}>
          <View style={styles.labResultHeader}>
            <Text style={styles.labResultName}>{result.testName}</Text>
            <View
              style={[
                styles.labResultBadge,
                {
                  backgroundColor:
                    result.status === 'normal'
                      ? theme.colors.successLight
                      : result.status === 'abnormal'
                      ? theme.colors.warningLight
                      : theme.colors.errorLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.labResultStatus,
                  {
                    color:
                      result.status === 'normal'
                        ? theme.colors.success
                        : result.status === 'abnormal'
                        ? theme.colors.warning
                        : theme.colors.error,
                  },
                ]}
              >
                {result.status}
              </Text>
            </View>
          </View>
          <Text style={styles.labResultValue}>{result.value}</Text>
          <Text style={styles.labResultDate}>{result.date.toLocaleDateString()}</Text>
        </View>
      ))}
    </Card>
  );

  const renderInsightsTab = () => (
    <>
      {insights.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>💡</Text>
          <Text style={styles.emptyTitle}>No Insights Yet</Text>
          <Text style={styles.emptyText}>
            Run diagnosis analysis to get AI-powered clinical insights
          </Text>
        </Card>
      ) : (
        insights.map((insight) => (
          <Card
            key={insight.id}
            style={[
              styles.insightCard,
              { borderLeftColor: getInsightColor(insight.type), borderLeftWidth: 4 } as const,
            ]}
          >
            <View style={styles.insightHeader}>
              <Text style={styles.insightIcon}>{getInsightIcon(insight.type)}</Text>
              <Text style={[styles.insightType, { color: getInsightColor(insight.type) }]}>
                {insight.type.toUpperCase()}
              </Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(insight.confidence * 100)}% confidence
                </Text>
              </View>
            </View>
            <Text style={styles.insightMessage}>{insight.message}</Text>
          </Card>
        ))
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Smart Diagnosis</Text>
        <Text style={styles.headerSubtitle}>AI-powered clinical decision support</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'input' && styles.tabActive]}
          onPress={() => setSelectedTab('input')}
        >
          <Text style={[styles.tabText, selectedTab === 'input' && styles.tabTextActive]}>
            Input
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'diagnosis' && styles.tabActive]}
          onPress={() => setSelectedTab('diagnosis')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'diagnosis' && styles.tabTextActive]}
          >
            Diagnosis
          </Text>
          {diagnoses.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{diagnoses.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'labs' && styles.tabActive]}
          onPress={() => setSelectedTab('labs')}
        >
          <Text style={[styles.tabText, selectedTab === 'labs' && styles.tabTextActive]}>
            Labs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'insights' && styles.tabActive]}
          onPress={() => setSelectedTab('insights')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'insights' && styles.tabTextActive]}
          >
            Insights
          </Text>
          {insights.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{insights.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {selectedTab === 'input' && renderInputTab()}
          {selectedTab === 'diagnosis' && renderDiagnosisTab()}
          {selectedTab === 'labs' && renderLabsTab()}
          {selectedTab === 'insights' && renderInsightsTab()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing[1],
    },
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing[3],
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      flexDirection: 'row',
    },
    tabActive: {
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    tabBadge: {
      marginLeft: theme.spacing[1],
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.full,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[1],
    },
    tabBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: '#FFFFFF',
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing[4],
    },
    ehrCard: {
      marginBottom: theme.spacing[4],
      backgroundColor: theme.colors.successLight,
    },
    ehrHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ehrIcon: {
      fontSize: 32,
      marginRight: theme.spacing[3],
    },
    ehrInfo: {
      flex: 1,
    },
    ehrTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[1],
    },
    ehrDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    card: {
      marginBottom: theme.spacing[4],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[3],
    },
    sectionSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: -theme.spacing[2],
      marginBottom: theme.spacing[3],
    },
    textArea: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing[3],
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      minHeight: 100,
    },
    symptomsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: theme.spacing[3],
      gap: theme.spacing[2],
    },
    symptomChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryLight,
      paddingVertical: theme.spacing[2],
      paddingLeft: theme.spacing[3],
      paddingRight: theme.spacing[2],
      borderRadius: theme.borderRadius.full,
    },
    symptomText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      marginRight: theme.spacing[2],
      fontWeight: theme.typography.fontWeight.medium,
    },
    symptomRemove: {
      fontSize: 16,
      color: theme.colors.primary,
      opacity: 0.7,
    },
    quickSymptoms: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing[2],
    },
    quickSymptomButton: {
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[3],
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    quickSymptomText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    analyzeButton: {
      marginTop: theme.spacing[2],
    },
    loadingCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing[8],
    },
    loadingText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginTop: theme.spacing[4],
    },
    loadingSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing[2],
      textAlign: 'center',
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing[8],
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: theme.spacing[3],
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[2],
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
    },
    diagnosisCard: {
      marginBottom: theme.spacing[4],
    },
    diagnosisHeader: {
      flexDirection: 'row',
      marginBottom: theme.spacing[3],
    },
    diagnosisRank: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    diagnosisRankText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: '#FFFFFF',
    },
    diagnosisTitleSection: {
      flex: 1,
    },
    diagnosisTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[2],
    },
    diagnosisMetrics: {
      flexDirection: 'row',
      gap: theme.spacing[2],
    },
    probabilityBadge: {
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.sm,
    },
    probabilityText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    urgencyBadge: {
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.sm,
    },
    urgencyText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
    },
    diagnosisDescription: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
      marginBottom: theme.spacing[3],
    },
    testsSection: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.md,
    },
    testsTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing[2],
    },
    testItem: {
      flexDirection: 'row',
      marginBottom: theme.spacing[1],
    },
    testBullet: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.primary,
      marginRight: theme.spacing[2],
      fontWeight: theme.typography.fontWeight.bold,
    },
    testText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text,
    },
    labResultItem: {
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    labResultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    labResultName: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text,
      flex: 1,
    },
    labResultBadge: {
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.sm,
    },
    labResultStatus: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
    },
    labResultValue: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing[1],
    },
    labResultDate: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
    },
    insightCard: {
      marginBottom: theme.spacing[3],
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    insightIcon: {
      fontSize: 20,
      marginRight: theme.spacing[2],
    },
    insightType: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      marginRight: theme.spacing[2],
    },
    confidenceBadge: {
      marginLeft: 'auto',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.sm,
    },
    confidenceText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    insightMessage: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    },
  });
