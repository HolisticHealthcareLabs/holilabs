/**
 * K6 Load Test: SOAP Note Generation Scenario
 *
 * Simulates 20 concurrent AI transcription requests
 * Tests AI processing pipeline under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics
const errorRate = new Rate('errors');
const transcriptionDuration = new Trend('transcription_duration');
const aiProcessingDuration = new Trend('ai_processing_duration');
const confidenceScore = new Trend('confidence_score');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 5 },    // Warm up slowly (AI is expensive)
    { duration: '3m', target: 20 },   // Peak at 20 concurrent requests
    { duration: '5m', target: 20 },   // Sustained AI load
    { duration: '2m', target: 0 },    // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<30000', 'p(99)<45000'], // AI takes longer
    'transcription_duration': ['p(95)<15000'],            // Transcription under 15s
    'ai_processing_duration': ['p(95)<30000'],            // Full SOAP generation under 30s
    'confidence_score': ['avg>80'],                       // Average confidence above 80%
    'http_req_failed': ['rate<0.01'],                     // Allow slightly higher error rate for AI
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://holilabs.xyz';
const API_KEY = __ENV.API_KEY || '';

// Sample clinical audio transcripts for testing
const sampleTranscripts = new SharedArray('transcripts', function () {
  return [
    {
      specialty: 'primary-care',
      transcript: 'Patient presents with complaints of persistent cough for the past two weeks. Denies fever or shortness of breath. Physical examination reveals clear lung sounds bilaterally. No signs of respiratory distress. Assessment: likely viral upper respiratory infection. Plan: symptomatic treatment with cough suppressant, adequate hydration, and follow-up if symptoms worsen.',
    },
    {
      specialty: 'cardiology',
      transcript: 'Follow-up visit for hypertension management. Patient reports good medication compliance. Blood pressure today 128 over 82, improved from last visit. No chest pain or palpitations. Continue current medication regimen of lisinopril 10mg daily. Discussed importance of low sodium diet and regular exercise.',
    },
    {
      specialty: 'pediatrics',
      transcript: 'Well-child visit for 5-year-old male. Growth parameters within normal limits. Height at 50th percentile, weight at 55th percentile. Development appropriate for age. All recommended vaccines up to date. Discussed nutrition, safety, and developmental milestones with parent.',
    },
    {
      specialty: 'dermatology',
      transcript: 'Patient presents with new onset rash on bilateral lower extremities. Rash described as erythematous and pruritic, present for one week. No known exposures or new medications. Physical exam shows erythematous macular rash. Assessment: contact dermatitis versus allergic reaction. Plan: topical corticosteroid cream, oral antihistamine, avoid potential triggers.',
    },
    {
      specialty: 'orthopedics',
      transcript: 'Patient presents with right knee pain following sports injury three days ago. Reports immediate swelling and difficulty bearing weight. Examination reveals moderate effusion, positive McMurray test. Range of motion limited by pain. Assessment: possible meniscal tear. Plan: MRI to evaluate for structural damage, RICE protocol, NSAIDs for pain, orthopedic referral.',
    },
  ];
});

export default function () {
  const startTime = Date.now();

  // Select a random sample transcript
  const sample = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];

  // 1. Initiate transcription (simulate audio upload)
  const transcriptStartTime = Date.now();

  const uploadPayload = JSON.stringify({
    encounterId: `encounter-${__VU}-${__ITER}`,
    audioProvider: 'deepgram', // or 'openai-whisper', 'assemblyai'
    specialty: sample.specialty,
    simulate: true, // Flag for load testing - uses sample transcript
    transcript: sample.transcript,
  });

  const uploadResponse = http.post(
    `${BASE_URL}/api/soap-notes/transcribe`,
    uploadPayload,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'InitiateTranscription' },
      timeout: '60s',
    }
  );

  const uploadSuccess = check(uploadResponse, {
    'transcription initiated': (r) => r.status === 200 || r.status === 202,
    'has transcription ID': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.transcriptionId !== undefined || data.id !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!uploadSuccess) {
    errorRate.add(1);
    return;
  }

  const transcriptEndTime = Date.now();
  transcriptionDuration.add(transcriptEndTime - transcriptStartTime);

  const transcriptionId = JSON.parse(uploadResponse.body).transcriptionId || JSON.parse(uploadResponse.body).id;

  sleep(2); // Simulate transcription processing time

  // 2. Generate SOAP note from transcript
  const aiStartTime = Date.now();

  const generatePayload = JSON.stringify({
    transcriptionId: transcriptionId,
    specialty: sample.specialty,
    aiProvider: 'anthropic', // or 'openai', 'google'
    template: sample.specialty,
  });

  const generateResponse = http.post(
    `${BASE_URL}/api/soap-notes/generate`,
    generatePayload,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'GenerateSOAPNote' },
      timeout: '60s',
    }
  );

  const generateSuccess = check(generateResponse, {
    'SOAP note generated': (r) => r.status === 200 || r.status === 201,
    'has SOAP sections': (r) => {
      try {
        const data = JSON.parse(r.body);
        return (
          data.subjective !== undefined &&
          data.objective !== undefined &&
          data.assessment !== undefined &&
          data.plan !== undefined
        );
      } catch {
        return false;
      }
    },
    'has confidence score': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.confidenceScore !== undefined;
      } catch {
        return false;
      }
    },
    'generation under 30 seconds': (r) => r.timings.duration < 30000,
  });

  if (!generateSuccess) {
    errorRate.add(1);
    return;
  }

  const aiEndTime = Date.now();
  aiProcessingDuration.add(aiEndTime - aiStartTime);

  // Track confidence score
  const noteData = JSON.parse(generateResponse.body);
  if (noteData.confidenceScore) {
    confidenceScore.add(noteData.confidenceScore);
  }

  sleep(3); // Provider reviews the generated note

  // 3. Check if note requires review (confidence < 80%)
  if (noteData.confidenceScore && noteData.confidenceScore < 80) {
    const reviewResponse = http.get(
      `${BASE_URL}/api/soap-notes/review-queue?specialty=${sample.specialty}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
        },
        tags: { name: 'CheckReviewQueue' },
      }
    );

    check(reviewResponse, {
      'review queue accessible': (r) => r.status === 200,
      'note appears in queue': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data.notes) && data.notes.length > 0;
        } catch {
          return false;
        }
      },
    });
  }

  // 4. Finalize note (approve or edit)
  const finalizePayload = JSON.stringify({
    noteId: noteData.id || noteData.noteId,
    status: noteData.confidenceScore >= 80 ? 'approved' : 'reviewed',
    edits: noteData.confidenceScore < 80 ? { subjective: 'Minor edit for testing' } : null,
  });

  const finalizeResponse = http.post(
    `${BASE_URL}/api/soap-notes/finalize`,
    finalizePayload,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'FinalizeNote' },
    }
  );

  const finalizeSuccess = check(finalizeResponse, {
    'note finalized': (r) => r.status === 200,
    'note marked complete': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.status === 'completed' || data.completed === true;
      } catch {
        return false;
      }
    },
  });

  if (!finalizeSuccess) {
    errorRate.add(1);
  }

  sleep(2);
}

export function handleSummary(data) {
  let summary = '\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '  SOAP NOTE GENERATION TEST RESULTS\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  if (data.metrics.transcription_duration) {
    const p95 = data.metrics.transcription_duration.values['p(95)'];
    summary += `  Transcription Time (p95): ${(p95 / 1000).toFixed(2)}s ${p95 < 15000 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.ai_processing_duration) {
    const p95 = data.metrics.ai_processing_duration.values['p(95)'];
    summary += `  AI Processing Time (p95): ${(p95 / 1000).toFixed(2)}s ${p95 < 30000 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.confidence_score) {
    const avg = data.metrics.confidence_score.values.avg;
    const min = data.metrics.confidence_score.values.min;
    const max = data.metrics.confidence_score.values.max;
    summary += `  Confidence Score (avg): ${avg.toFixed(2)}% ${avg > 80 ? '✓' : '✗'}\n`;
    summary += `  Confidence Score (range): ${min.toFixed(2)}% - ${max.toFixed(2)}%\n`;
  }

  if (data.metrics.http_req_failed) {
    const rate = data.metrics.http_req_failed.values.rate;
    summary += `  Error Rate: ${(rate * 100).toFixed(3)}% ${rate < 0.01 ? '✓' : '✗'}\n`;
  }

  if (data.metrics.http_reqs) {
    summary += `  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  }

  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return {
    'summary-soap-generation.json': JSON.stringify(data),
    'stdout': summary,
  };
}
