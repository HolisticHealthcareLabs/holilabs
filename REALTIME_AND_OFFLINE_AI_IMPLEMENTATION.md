# 🚀 Real-time WebSocket & Offline AI Implementation Plan

**Date:** December 1, 2025
**Objective:** Enable real-time bidirectional communication everywhere + Offline AI with LM Studio

---

## 📊 Current State Analysis

### ✅ What We Have
- **Web App:** Socket.IO server fully implemented (apps/web/src/lib/socket-server.ts:1)
- **Web Client:** Socket.IO client with authentication (apps/web/src/lib/chat/socket-client.ts:1)
- **Features Implemented:**
  - Real-time chat messaging
  - Typing indicators
  - Read receipts
  - Online/offline status
  - Co-Pilot audio streaming
  - Notification system (appointments, medications, lab results)

### ❌ What's Missing
- **Mobile App:** No WebSocket/Socket.IO implementation
- **Real-time Data Sync:** Patient records, clinical notes, appointments not synced real-time
- **Offline AI:** No local LLM integration
- **Server-Side Events:** Limited use of WebSockets for live updates

---

## 🎯 Implementation Goals

### Phase 1: Mobile WebSocket Integration (Week 1)
1. Add Socket.IO client to React Native mobile app
2. Implement authentication with Supabase tokens
3. Enable real-time chat on iOS/Android
4. Sync appointments and notifications real-time
5. Handle reconnection and offline queuing

### Phase 2: Expand Real-time Features (Week 2)
1. Real-time patient record updates
2. Live clinical note collaboration
3. Appointment reminders via WebSocket
4. Lab result notifications
5. Medication adherence tracking

### Phase 3: Offline AI with LM Studio (Week 3-4)
1. Integrate LM Studio API for local inference
2. Create fallback system: Cloud AI → Local AI → Cached responses
3. Implement model management UI
4. Support common medical models (Llama 3, Mistral, etc.)
5. Optimize for clinical note generation

### Phase 4: Synthetic Data & Model Training (Week 5-6)
1. Create synthetic patient data generator
2. Build clinical note dataset from templates
3. Fine-tune models with synthetic data
4. Evaluate model performance
5. Deploy custom models to LM Studio

---

## 🔧 Technical Implementation

### 1. Mobile WebSocket Setup

#### A. Install Dependencies

```bash
cd apps/mobile
pnpm add socket.io-client @react-native-community/netinfo
```

#### B. Create WebSocket Service

**File:** `apps/mobile/src/services/websocket.ts`

```typescript
import { io, Socket } from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/env';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private messageQueue: any[] = [];

  async connect(authToken: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    const wsUrl = API_URL.replace('http', 'ws').replace('https', 'wss');

    this.socket = io(wsUrl, {
      path: '/api/socket',
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
    this.setupNetworkListener();

    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
    });

    // Real-time message handlers
    this.socket.on('new_message', (message) => {
      // Handle incoming message
      this.handleNewMessage(message);
    });

    this.socket.on('notification:appointment', (data) => {
      // Show appointment notification
      this.showNotification('Appointment', data.message);
    });

    this.socket.on('notification:medication', (data) => {
      // Show medication reminder
      this.showNotification('Medication', data.message);
    });

    this.socket.on('patient_updated', (data) => {
      // Sync patient record update
      this.handlePatientUpdate(data);
    });

    this.socket.on('clinical_note_updated', (data) => {
      // Sync clinical note update
      this.handleClinicalNoteUpdate(data);
    });
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.socket?.connected) {
        console.log('📶 Network restored, reconnecting WebSocket...');
        this.socket?.connect();
      }
    });
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue message for when connection restored
      this.messageQueue.push({ event, data, timestamp: Date.now() });
      this.saveQueueToStorage();
    }
  }

  private async flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Flushing ${this.messageQueue.length} queued messages`);

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const { event, data } of queue) {
      this.socket?.emit(event, data);
    }

    await this.clearQueueFromStorage();
  }

  private async saveQueueToStorage() {
    try {
      await AsyncStorage.setItem('ws_message_queue', JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('Failed to save message queue:', error);
    }
  }

  private async clearQueueFromStorage() {
    try {
      await AsyncStorage.removeItem('ws_message_queue');
    } catch (error) {
      console.error('Failed to clear message queue:', error);
    }
  }

  private handleNewMessage(message: any) {
    // Store message in local database
    // Update UI
    // Show notification if app in background
  }

  private handlePatientUpdate(data: any) {
    // Invalidate React Query cache
    // Refetch patient data
  }

  private handleClinicalNoteUpdate(data: any) {
    // Sync clinical note changes
    // Update local cache
  }

  private showNotification(title: string, message: string) {
    // Show native notification
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket() {
    return this.socket;
  }
}

export default new WebSocketService();
```

#### C. React Hook for WebSocket

**File:** `apps/mobile/src/hooks/useWebSocket.ts`

```typescript
import { useEffect, useState } from 'react';
import WebSocketService from '../services/websocket';
import { useAuthStore } from '../stores/authStore';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const connect = async () => {
      try {
        const socket = await WebSocketService.connect(token);

        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    connect();

    return () => {
      WebSocketService.disconnect();
    };
  }, [token]);

  return {
    isConnected,
    emit: WebSocketService.emit.bind(WebSocketService),
    socket: WebSocketService.getSocket(),
  };
}
```

---

### 2. LM Studio Integration

#### A. LM Studio Setup

LM Studio is a desktop app that runs LLMs locally. It provides an OpenAI-compatible API.

**Installation:**
1. Download LM Studio: https://lmstudio.ai
2. Install and launch
3. Download a medical-compatible model (e.g., Llama 3 8B, Mistral 7B)
4. Start the local server (default: http://localhost:1234)

#### B. Create LM Studio Client

**File:** `apps/web/src/lib/ai/lm-studio-client.ts`

```typescript
/**
 * LM Studio Client - Local AI Inference
 *
 * Provides fallback to local LLM when cloud AI is unavailable
 */

import axios from 'axios';
import logger from '../logger';

interface LMStudioConfig {
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_CONFIG: LMStudioConfig = {
  endpoint: process.env.LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1',
  model: 'local-model', // Will be overridden by user selection
  temperature: 0.7,
  maxTokens: 2000,
};

class LMStudioClient {
  private config: LMStudioConfig;
  private isAvailable: boolean = false;

  constructor(config?: Partial<LMStudioConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.checkAvailability();
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.endpoint}/models`, {
        timeout: 3000,
      });

      this.isAvailable = response.status === 200;

      logger.info({
        event: 'lm_studio_available',
        models: response.data.data?.length || 0,
      });

      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;
      logger.warn({
        event: 'lm_studio_unavailable',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async generateClinicalNote(
    transcript: string,
    patientContext?: any
  ): Promise<string> {
    if (!this.isAvailable) {
      throw new Error('LM Studio is not available');
    }

    const prompt = this.buildClinicalNotePrompt(transcript, patientContext);

    try {
      const response = await axios.post(
        `${this.config.endpoint}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI assistant that generates structured clinical notes from patient consultations.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        },
        {
          timeout: 60000, // 60 second timeout for local inference
        }
      );

      const note = response.data.choices[0].message.content;

      logger.info({
        event: 'lm_studio_note_generated',
        transcript_length: transcript.length,
        note_length: note.length,
      });

      return note;
    } catch (error) {
      logger.error({
        event: 'lm_studio_generation_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private buildClinicalNotePrompt(transcript: string, patientContext?: any): string {
    let prompt = `Generate a structured clinical note from the following patient consultation:\n\n`;

    if (patientContext) {
      prompt += `Patient Information:\n`;
      prompt += `- Name: ${patientContext.name}\n`;
      prompt += `- Age: ${patientContext.age}\n`;
      prompt += `- Medical History: ${patientContext.medicalHistory || 'None recorded'}\n\n`;
    }

    prompt += `Consultation Transcript:\n${transcript}\n\n`;
    prompt += `Please generate a clinical note with the following sections:\n`;
    prompt += `1. Chief Complaint\n`;
    prompt += `2. History of Present Illness\n`;
    prompt += `3. Physical Examination\n`;
    prompt += `4. Assessment\n`;
    prompt += `5. Plan\n\n`;
    prompt += `Format the note in a professional, concise manner suitable for medical records.`;

    return prompt;
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.endpoint}/models`);
      return response.data.data.map((model: any) => model.id);
    } catch (error) {
      logger.error({
        event: 'lm_studio_list_models_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  setModel(modelId: string) {
    this.config.model = modelId;
    logger.info({
      event: 'lm_studio_model_changed',
      model: modelId,
    });
  }

  getStatus() {
    return {
      available: this.isAvailable,
      endpoint: this.config.endpoint,
      model: this.config.model,
    };
  }
}

export default new LMStudioClient();
```

#### C. AI Service with Fallback Logic

**File:** `apps/web/src/lib/ai/ai-service.ts`

```typescript
/**
 * AI Service with Multi-Tier Fallback
 *
 * Tier 1: Anthropic Claude (Cloud)
 * Tier 2: LM Studio (Local)
 * Tier 3: Cached/Template Responses
 */

import Anthropic from '@anthropic-ai/sdk';
import LMStudioClient from './lm-studio-client';
import logger from '../logger';
import { redis } from '../redis';

type AIProvider = 'anthropic' | 'lm-studio' | 'cache';

interface GenerateNoteOptions {
  transcript: string;
  patientContext?: any;
  preferLocal?: boolean;
}

class AIService {
  private anthropic: Anthropic;
  private fallbackOrder: AIProvider[] = ['anthropic', 'lm-studio', 'cache'];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateClinicalNote(options: GenerateNoteOptions): Promise<{
    note: string;
    provider: AIProvider;
    cached: boolean;
  }> {
    const { transcript, patientContext, preferLocal } = options;

    // Check cache first
    const cacheKey = `clinical_note:${this.hashTranscript(transcript)}`;
    const cached = await this.getCachedNote(cacheKey);
    if (cached) {
      return { note: cached, provider: 'cache', cached: true };
    }

    // Determine provider order based on preference
    const providers = preferLocal
      ? ['lm-studio', 'anthropic', 'cache']
      : this.fallbackOrder;

    for (const provider of providers) {
      try {
        let note: string;

        switch (provider) {
          case 'anthropic':
            note = await this.generateWithAnthropic(transcript, patientContext);
            break;

          case 'lm-studio':
            // Check if LM Studio is available
            const available = await LMStudioClient.checkAvailability();
            if (!available) continue;

            note = await LMStudioClient.generateClinicalNote(transcript, patientContext);
            break;

          case 'cache':
            note = this.generateTemplateNote(transcript, patientContext);
            break;

          default:
            continue;
        }

        // Cache successful response
        await this.cacheNote(cacheKey, note);

        logger.info({
          event: 'clinical_note_generated',
          provider,
          transcript_length: transcript.length,
          note_length: note.length,
        });

        return { note, provider, cached: false };
      } catch (error) {
        logger.warn({
          event: 'ai_provider_failed',
          provider,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  private async generateWithAnthropic(
    transcript: string,
    patientContext?: any
  ): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: this.buildPrompt(transcript, patientContext),
      }],
    });

    return message.content[0].type === 'text' ? message.content[0].text : '';
  }

  private buildPrompt(transcript: string, patientContext?: any): string {
    // Same prompt building logic as LM Studio
    let prompt = `Generate a structured clinical note from the following patient consultation:\n\n`;

    if (patientContext) {
      prompt += `Patient Information:\n`;
      prompt += `- Name: ${patientContext.name}\n`;
      prompt += `- Age: ${patientContext.age}\n`;
      prompt += `- Medical History: ${patientContext.medicalHistory || 'None recorded'}\n\n`;
    }

    prompt += `Consultation Transcript:\n${transcript}\n\n`;
    prompt += `Please generate a clinical note with standard SOAP format.`;

    return prompt;
  }

  private generateTemplateNote(transcript: string, patientContext?: any): string {
    // Fallback template when all AI providers fail
    return `
CLINICAL NOTE (Template)
Date: ${new Date().toISOString()}

Patient: ${patientContext?.name || 'Unknown'}

CHIEF COMPLAINT:
${this.extractChiefComplaint(transcript)}

CONSULTATION NOTES:
${transcript}

ASSESSMENT:
[Requires manual review and completion]

PLAN:
[Requires manual review and completion]

---
Note: This note was generated using a template due to AI service unavailability.
Please review and complete manually.
    `.trim();
  }

  private extractChiefComplaint(transcript: string): string {
    // Simple extraction - first sentence or first 100 chars
    const sentences = transcript.split(/[.!?]/);
    return sentences[0]?.trim() || transcript.substring(0, 100);
  }

  private hashTranscript(transcript: string): string {
    // Simple hash for cache key
    return Buffer.from(transcript).toString('base64').substring(0, 32);
  }

  private async getCachedNote(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch (error) {
      return null;
    }
  }

  private async cacheNote(key: string, note: string): Promise<void> {
    try {
      // Cache for 7 days
      await redis.setex(key, 7 * 24 * 60 * 60, note);
    } catch (error) {
      logger.warn({
        event: 'cache_note_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getProviderStatus() {
    const [anthropicAvailable, lmStudioAvailable] = await Promise.all([
      this.checkAnthropicAvailability(),
      LMStudioClient.checkAvailability(),
    ]);

    return {
      anthropic: anthropicAvailable,
      lmStudio: lmStudioAvailable ? LMStudioClient.getStatus() : null,
    };
  }

  private async checkAnthropicAvailability(): Promise<boolean> {
    try {
      // Simple health check
      await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new AIService();
```

---

### 3. Synthetic Data Generation

#### A. Patient Data Generator

**File:** `scripts/generate-synthetic-data.ts`

```typescript
/**
 * Synthetic Patient Data Generator
 *
 * Creates realistic but fake patient data for model training
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

interface SyntheticPatient {
  name: string;
  dateOfBirth: Date;
  gender: string;
  medicalHistory: string[];
  allergies: string[];
  medications: string[];
}

const COMMON_CONDITIONS = [
  'Hypertension',
  'Type 2 Diabetes',
  'Asthma',
  'Allergic Rhinitis',
  'Migraine',
  'Anxiety Disorder',
  'Depression',
  'Osteoarthritis',
  'GERD',
  'Hyperlipidemia',
];

const COMMON_ALLERGIES = [
  'Penicillin',
  'Sulfa drugs',
  'Aspirin',
  'Latex',
  'Shellfish',
  'Peanuts',
  'No known allergies',
];

const COMMON_MEDICATIONS = [
  'Lisinopril 10mg daily',
  'Metformin 500mg twice daily',
  'Atorvastatin 20mg nightly',
  'Albuterol inhaler as needed',
  'Omeprazole 20mg daily',
  'Levothyroxine 50mcg daily',
];

function generateSyntheticPatient(): SyntheticPatient {
  const gender = faker.person.sex();
  const firstName = faker.person.firstName(gender);
  const lastName = faker.person.lastName();

  return {
    name: `${firstName} ${lastName}`,
    dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
    gender: gender === 'male' ? 'M' : 'F',
    medicalHistory: faker.helpers.arrayElements(COMMON_CONDITIONS, { min: 0, max: 3 }),
    allergies: faker.helpers.arrayElements(COMMON_ALLERGIES, { min: 1, max: 2 }),
    medications: faker.helpers.arrayElements(COMMON_MEDICATIONS, { min: 0, max: 4 }),
  };
}

function generateConsultationTranscript(patient: SyntheticPatient): string {
  const chiefComplaint = faker.helpers.arrayElement([
    'chest pain',
    'shortness of breath',
    'persistent cough',
    'abdominal pain',
    'headache',
    'back pain',
    'fatigue',
    'dizziness',
  ]);

  const duration = faker.helpers.arrayElement([
    '2 days',
    '1 week',
    '3 weeks',
    'several months',
  ]);

  return `
Patient presents with ${chiefComplaint} for the past ${duration}.
Patient states the symptoms started ${duration} ago.
${faker.helpers.arrayElement([
  'Symptoms are worse in the morning.',
  'Symptoms occur sporadically throughout the day.',
  'Symptoms are constant.',
])}

Medical history includes: ${patient.medicalHistory.join(', ') || 'unremarkable'}.
Current medications: ${patient.medications.join(', ') || 'none'}.
Allergies: ${patient.allergies.join(', ')}.

Physical examination:
- Vital signs: BP ${faker.number.int({ min: 110, max: 140 })}/${faker.number.int({ min: 70, max: 90 })},
  HR ${faker.number.int({ min: 60, max: 100 })},
  Temp ${faker.number.float({ min: 36.5, max: 37.5, precision: 0.1 })}°C
- General: Alert and oriented x3
- ${faker.helpers.arrayElement([
  'Cardiovascular: Regular rate and rhythm, no murmurs',
  'Respiratory: Clear to auscultation bilaterally',
  'Abdomen: Soft, non-tender, non-distended',
])}

Assessment:
${faker.helpers.arrayElement([
  'Likely viral upper respiratory infection',
  'Musculoskeletal strain',
  'Acute gastritis',
  'Tension headache',
  'Anxiety-related symptoms',
])}

Plan:
1. ${faker.helpers.arrayElement([
  'Prescribe ibuprofen 400mg TID PRN',
  'Order CBC and CMP',
  'Start omeprazole 20mg daily',
  'Refer to physical therapy',
])}
2. Follow up in ${faker.helpers.arrayElement(['1 week', '2 weeks', '1 month'])}
3. Return to ER if symptoms worsen
  `.trim();
}

async function generateDataset(count: number) {
  console.log(`Generating ${count} synthetic patient records...`);

  for (let i = 0; i < count; i++) {
    const patient = generateSyntheticPatient();
    const transcript = generateConsultationTranscript(patient);

    // Save to database
    await prisma.syntheticData.create({
      data: {
        patientData: patient,
        transcript,
        clinicalNote: '', // Will be filled by AI generation
        metadata: {
          generated: new Date().toISOString(),
          version: '1.0',
        },
      },
    });

    if ((i + 1) % 100 === 0) {
      console.log(`Generated ${i + 1}/${count} records`);
    }
  }

  console.log(`✅ Successfully generated ${count} synthetic records`);
}

// Run generator
generateDataset(1000).then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
```

---

## 📋 Implementation Checklist

### Week 1: Mobile WebSocket
- [ ] Install socket.io-client in mobile app
- [ ] Create WebSocket service with offline queue
- [ ] Implement authentication flow
- [ ] Add real-time chat to mobile UI
- [ ] Test on iOS and Android devices
- [ ] Handle network disconnections gracefully

### Week 2: Expand Real-time Features
- [ ] Add WebSocket events for patient updates
- [ ] Implement real-time appointment sync
- [ ] Add live notification delivery
- [ ] Create clinical note collaboration
- [ ] Test concurrent edits and conflict resolution

### Week 3: LM Studio Integration
- [ ] Set up LM Studio on development machine
- [ ] Create LM Studio client library
- [ ] Implement AI service with fallback logic
- [ ] Add model selection UI
- [ ] Test offline clinical note generation
- [ ] Benchmark performance vs cloud AI

### Week 4: Synthetic Data
- [ ] Install Faker.js and dependencies
- [ ] Create patient data generator
- [ ] Generate 1000+ consultation transcripts
- [ ] Use AI to generate corresponding notes
- [ ] Review and validate synthetic data quality
- [ ] Export dataset in JSONL format

### Week 5: Model Training
- [ ] Set up fine-tuning pipeline
- [ ] Prepare training/validation split
- [ ] Fine-tune Llama 3 or Mistral on dataset
- [ ] Evaluate model on test set
- [ ] Compare with base model performance
- [ ] Deploy fine-tuned model to LM Studio

### Week 6: Production Deployment
- [ ] Update Docker Compose with LM Studio container
- [ ] Document LM Studio setup for users
- [ ] Create admin UI for AI provider selection
- [ ] Add monitoring for AI service health
- [ ] Load test WebSocket connections
- [ ] Deploy to holilabs.xyz

---

## 🚀 Quick Start Commands

### Install Mobile Dependencies
```bash
cd apps/mobile
pnpm add socket.io-client @react-native-community/netinfo
```

### Install LM Studio
```bash
# Download from https://lmstudio.ai
# Or use Homebrew on macOS
brew install --cask lm-studio
```

### Generate Synthetic Data
```bash
cd scripts
pnpm add @faker-js/faker
npx ts-node generate-synthetic-data.ts
```

### Test WebSocket Connection
```bash
# In browser console or Node.js
const socket = io('http://localhost:3000', {
  path: '/api/socket',
  auth: { token: 'your-token' }
});

socket.on('connect', () => console.log('Connected!'));
```

---

## 📊 Success Metrics

### Technical Metrics
- WebSocket connection reliability: >99% uptime
- Message delivery latency: <100ms
- Offline queue recovery: 100% of messages sent
- LM Studio availability: >95% (when running)
- Fallback success rate: 100% (at least one provider works)

### User Experience Metrics
- Real-time chat delivery: <1 second
- Notification delivery: <2 seconds
- Clinical note generation: <30 seconds (local), <10 seconds (cloud)
- Offline mode functionality: All features work with sync

---

**Last Updated:** December 1, 2025
**Version:** 1.0
**Next Review:** December 15, 2025
