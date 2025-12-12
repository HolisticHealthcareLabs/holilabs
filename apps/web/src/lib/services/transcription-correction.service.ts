/**
 * Transcription Correction Service
 * Aggregates corrections and prepares training data for ML improvement (RLHF Loop)
 */

import { prisma } from '@/lib/prisma';

export interface CorrectionAnalytics {
  totalCorrections: number;
  avgConfidence: number;
  avgEditDistance: number;
  mostCommonErrors: Array<{
    originalText: string;
    correctedText: string;
    frequency: number;
  }>;
  errorsBySpecialty: Record<string, number>;
  improvementTrend: Array<{
    date: string;
    errorRate: number;
  }>;
}

export interface TrainingBatch {
  corrections: Array<{
    original: string;
    corrected: string;
    context: {
      confidence: number;
      speaker: string | null;
      specialty?: string;
    };
  }>;
  language: string;
  specialty?: string;
  batchDate: Date;
}

export class TranscriptionCorrectionService {
  /**
   * Get corrections from a specific date range
   */
  async getCorrections(startDate: Date, endDate: Date) {
    return await prisma.transcriptionError.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        session: {
          include: {
            patient: true,
            clinician: true,
          },
        },
        correctedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Aggregate corrections into training batches
   * Groups by language and specialty for targeted fine-tuning
   */
  async createTrainingBatch(
    startDate: Date,
    endDate: Date,
    language: string = 'es-MX'
  ): Promise<TrainingBatch> {
    const corrections = await this.getCorrections(startDate, endDate);

    const trainingData = corrections.map((correction) => ({
      original: correction.originalText,
      corrected: correction.correctedText,
      context: {
        confidence: correction.confidence,
        speaker: correction.speaker,
        specialty: correction.correctedByUser.specialty || undefined,
      },
    }));

    return {
      corrections: trainingData,
      language,
      batchDate: new Date(),
    };
  }

  /**
   * Generate custom vocabulary for Deepgram/Whisper
   * Extracts medical terms that were corrected
   */
  async generateCustomVocabulary(
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    const corrections = await this.getCorrections(startDate, endDate);

    // Extract medical terms (words that differ significantly)
    const customTerms = new Set<string>();

    corrections.forEach((correction) => {
      const originalWords = correction.originalText.toLowerCase().split(/\s+/);
      const correctedWords = correction.correctedText.toLowerCase().split(/\s+/);

      correctedWords.forEach((word, index) => {
        // If word was changed and is medical (>4 chars, contains Latin chars)
        if (
          originalWords[index] !== word &&
          word.length > 4 &&
          /^[a-záéíóúñü]+$/i.test(word)
        ) {
          customTerms.add(word);
        }
      });
    });

    return Array.from(customTerms).sort();
  }

  /**
   * Get analytics on correction patterns
   */
  async getAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<CorrectionAnalytics> {
    const corrections = await this.getCorrections(startDate, endDate);

    if (corrections.length === 0) {
      return {
        totalCorrections: 0,
        avgConfidence: 0,
        avgEditDistance: 0,
        mostCommonErrors: [],
        errorsBySpecialty: {},
        improvementTrend: [],
      };
    }

    // Calculate averages
    const totalConfidence = corrections.reduce(
      (sum, c) => sum + c.confidence,
      0
    );
    const totalEditDistance = corrections.reduce(
      (sum, c) => sum + (c.editDistance || 0),
      0
    );

    // Find most common error patterns
    const errorPairs = new Map<string, number>();
    corrections.forEach((c) => {
      const key = `${c.originalText}:${c.correctedText}`;
      errorPairs.set(key, (errorPairs.get(key) || 0) + 1);
    });

    const mostCommonErrors = Array.from(errorPairs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, frequency]) => {
        const [originalText, correctedText] = key.split(':');
        return { originalText, correctedText, frequency };
      });

    // Group by specialty
    const errorsBySpecialty: Record<string, number> = {};
    corrections.forEach((c) => {
      const specialty = c.correctedByUser.specialty || 'General';
      errorsBySpecialty[specialty] = (errorsBySpecialty[specialty] || 0) + 1;
    });

    // Calculate improvement trend (last 7 days)
    const improvementTrend = await this.calculateImprovementTrend(
      startDate,
      endDate
    );

    return {
      totalCorrections: corrections.length,
      avgConfidence: totalConfidence / corrections.length,
      avgEditDistance: totalEditDistance / corrections.length,
      mostCommonErrors,
      errorsBySpecialty,
      improvementTrend,
    };
  }

  /**
   * Calculate error rate trend over time
   */
  private async calculateImprovementTrend(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; errorRate: number }>> {
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const trend: Array<{ date: string; errorRate: number }> = [];

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // Get corrections for this day
      const dayCorrections = await prisma.transcriptionError.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      // Get total transcriptions for this day
      const dayTranscriptions = await prisma.transcription.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      const errorRate =
        dayTranscriptions > 0 ? dayCorrections / dayTranscriptions : 0;

      trend.push({
        date: date.toISOString().split('T')[0],
        errorRate,
      });
    }

    return trend;
  }

  /**
   * Export corrections as JSON for external ML training
   */
  async exportCorrectionsAsJSON(
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const batch = await this.createTrainingBatch(startDate, endDate);
    return JSON.stringify(batch, null, 2);
  }

  /**
   * Export corrections as CSV for analysis
   */
  async exportCorrectionsAsCSV(
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const corrections = await this.getCorrections(startDate, endDate);

    const headers = [
      'Date',
      'Confidence',
      'EditDistance',
      'Speaker',
      'OriginalText',
      'CorrectedText',
      'Specialty',
      'ClinicianName',
    ];

    const rows = corrections.map((c) => [
      c.createdAt.toISOString(),
      c.confidence.toString(),
      (c.editDistance || 0).toString(),
      c.speaker || 'unknown',
      `"${c.originalText.replace(/"/g, '""')}"`, // Escape quotes
      `"${c.correctedText.replace(/"/g, '""')}"`,
      c.correctedByUser.specialty || 'General',
      `${c.correctedByUser.firstName} ${c.correctedByUser.lastName}`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

// Export singleton instance
export const transcriptionCorrectionService =
  new TranscriptionCorrectionService();
