/**
 * Claude API Integration Service
 *
 * Handles all interactions with Anthropic's Claude API for clinical intelligence
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface ClaudeRequestOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: 'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229';
}

export interface ClaudeResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  stopReason: string;
}

/**
 * Send message to Claude with clinical context
 */
export async function sendToClaude(
  message: string,
  options: ClaudeRequestOptions = {}
): Promise<ClaudeResponse> {
  if (!anthropic) {
    throw new Error('Anthropic API key not configured');
  }

  const {
    systemPrompt = 'Eres un asistente médico de IA especializado en análisis clínico. Proporciona respuestas precisas, basadas en evidencia y conformes con HIPAA.',
    temperature = 0.7,
    maxTokens = 4096,
    model = 'claude-3-5-sonnet-20241022',
  } = options;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    return {
      content: textContent.text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
      stopReason: response.stop_reason || 'unknown',
    };
  } catch (error: any) {
    console.error('Claude API error:', error);
    throw new Error(`Claude API error: ${error.message}`);
  }
}

/**
 * Summarize de-identified clinical document
 */
export async function summarizeClinicalDocument(
  deidentifiedText: string,
  documentType?: 'lab_results' | 'consultation_notes' | 'discharge_summary' | 'prescription' | 'general'
): Promise<ClaudeResponse> {
  const systemPrompts: Record<string, string> = {
    lab_results: `Eres un asistente médico de IA especializado en interpretación de resultados de laboratorio.
Tu tarea es:
1. Identificar todos los parámetros de laboratorio y sus valores
2. Destacar valores fuera de rango (altos o bajos)
3. Proporcionar interpretación clínica concisa
4. Sugerir posibles acciones de seguimiento

Formato de salida:
- Resumen ejecutivo (2-3 oraciones)
- Valores clave y tendencias
- Hallazgos significativos
- Recomendaciones

Recuerda: Este texto ya ha sido des-identificado siguiendo HIPAA Safe Harbor.`,

    consultation_notes: `Eres un asistente médico de IA especializado en análisis de notas clínicas.
Tu tarea es:
1. Extraer información SOAP (Subjetivo, Objetivo, Evaluación, Plan)
2. Identificar diagnósticos y condiciones
3. Resumir medicamentos mencionados
4. Destacar hallazgos clínicos importantes

Formato de salida:
- Resumen de consulta (2-3 oraciones)
- Motivo principal de consulta
- Hallazgos clave
- Plan de tratamiento

Recuerda: Este texto ya ha sido des-identificado siguiendo HIPAA Safe Harbor.`,

    discharge_summary: `Eres un asistente médico de IA especializado en resúmenes de alta hospitalaria.
Tu tarea es:
1. Resumir la estancia hospitalaria y procedimientos
2. Identificar diagnóstico principal y secundarios
3. Listar medicamentos al alta
4. Destacar instrucciones de seguimiento

Formato de salida:
- Resumen de hospitalización
- Diagnósticos
- Medicamentos al alta
- Instrucciones de seguimiento

Recuerda: Este texto ya ha sido des-identificado siguiendo HIPAA Safe Harbor.`,

    prescription: `Eres un asistente médico de IA especializado en análisis de prescripciones.
Tu tarea es:
1. Extraer todos los medicamentos, dosis y frecuencias
2. Identificar posibles interacciones (si hay múltiples medicamentos)
3. Verificar dosis apropiadas
4. Sugerir consideraciones clínicas

Formato de salida:
- Lista estructurada de medicamentos
- Alertas de interacciones (si aplica)
- Consideraciones clínicas

Recuerda: Este texto ya ha sido des-identificado siguiendo HIPAA Safe Harbor.`,

    general: `Eres un asistente médico de IA especializado en análisis de documentos clínicos.
Tu tarea es:
1. Identificar el tipo de documento
2. Extraer información clínica clave
3. Resumir de manera concisa y estructurada
4. Destacar hallazgos importantes

Formato de salida:
- Tipo de documento
- Resumen ejecutivo (2-3 oraciones)
- Información clínica clave
- Hallazgos destacados

Recuerda: Este texto ya ha sido des-identificado siguiendo HIPAA Safe Harbor.`,
  };

  const systemPrompt = systemPrompts[documentType || 'general'];

  const userMessage = `Por favor, analiza el siguiente documento clínico des-identificado y proporciona un resumen estructurado en español:

${deidentifiedText}`;

  return sendToClaude(userMessage, {
    systemPrompt,
    temperature: 0.5, // Lower temperature for medical accuracy
    maxTokens: 2048,
  });
}

/**
 * Generate SOAP note from consultation transcript
 */
export async function generateSOAPNote(
  transcriptText: string
): Promise<ClaudeResponse> {
  const systemPrompt = `Eres un asistente médico de IA especializado en crear notas SOAP estructuradas a partir de transcripciones de consultas.

Tu tarea es convertir la conversación clínica en una nota SOAP completa y profesional.

Formato SOAP:
S (Subjetivo): Síntomas del paciente, historia, quejas principales
O (Objetivo): Signos vitales, examen físico, hallazgos observables
A (Evaluación): Diagnóstico, impresión clínica, razonamiento
P (Plan): Tratamiento, medicamentos, estudios, seguimiento

Usa lenguaje médico profesional pero claro. El texto ya ha sido des-identificado.`;

  const userMessage = `Convierte la siguiente transcripción de consulta en una nota SOAP estructurada:

${transcriptText}`;

  return sendToClaude(userMessage, {
    systemPrompt,
    temperature: 0.3, // Very low temperature for structured output
    maxTokens: 2048,
  });
}

/**
 * Check for potential drug interactions
 */
export async function checkDrugInteractions(
  medications: string[]
): Promise<ClaudeResponse> {
  const systemPrompt = `Eres un farmacólogo clínico especializado en identificar interacciones medicamentosas.

Tu tarea es:
1. Analizar la lista de medicamentos
2. Identificar interacciones potenciales (mayores, moderadas, menores)
3. Explicar el mecanismo de cada interacción
4. Proporcionar recomendaciones clínicas

Usa evidencia actualizada y guías clínicas reconocidas.`;

  const userMessage = `Analiza las siguientes medicaciones para interacciones potenciales:

${medications.map((med, i) => `${i + 1}. ${med}`).join('\n')}

Proporciona un análisis detallado de interacciones y recomendaciones.`;

  return sendToClaude(userMessage, {
    systemPrompt,
    temperature: 0.3,
    maxTokens: 3000,
  });
}

/**
 * Answer clinical question with de-identified context
 */
export async function answerClinicalQuestion(
  question: string,
  context?: string
): Promise<ClaudeResponse> {
  const systemPrompt = `Eres un médico consultor de IA con conocimientos actualizados en medicina basada en evidencia.

Proporciona respuestas:
- Basadas en guías clínicas y evidencia científica
- Claras y concisas
- Con nivel de confianza cuando sea apropiado
- Con referencias a guías cuando sea relevante

IMPORTANTE: Siempre indica cuando una situación requiere evaluación presencial o más información.`;

  const userMessage = context
    ? `Contexto clínico (des-identificado):
${context}

Pregunta:
${question}`
    : question;

  return sendToClaude(userMessage, {
    systemPrompt,
    temperature: 0.7,
    maxTokens: 2048,
  });
}

/**
 * Health check for Claude API
 */
export async function healthCheck(): Promise<boolean> {
  if (!anthropic) {
    return false;
  }

  try {
    await sendToClaude('Test', { maxTokens: 10 });
    return true;
  } catch (error) {
    return false;
  }
}
