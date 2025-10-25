/**
 * AI Form Generation API
 *
 * POST /api/ai/forms/generate - Generate medical forms via conversational AI
 *
 * Uses Claude AI to understand doctor's requirements and generate
 * structured form templates through natural language conversation.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Eres un asistente experto en crear formularios médicos personalizados para doctores en México.

Tu rol es:
1. Hacer preguntas específicas y relevantes para entender qué tipo de formulario necesita el doctor
2. Recopilar información sobre los campos que debe incluir el formulario
3. Cuando tengas suficiente información, generar un formulario estructurado en formato JSON

Pasos del proceso:
1. Primero pregunta qué tipo de formulario necesita (ej: consentimiento, historial, evaluación)
2. Pregunta sobre campos específicos que debe incluir
3. Clarifica el propósito y contexto del formulario
4. Cuando tengas suficiente información (mínimo 3-4 campos), genera el formulario

Al generar el formulario, responde con:
- Un mensaje confirmando que generaste el formulario
- Un objeto JSON con esta estructura exacta después de "FORM_JSON:"

FORM_JSON:
{
  "title": "Título del formulario",
  "description": "Descripción breve",
  "category": "CONSENT|HIPAA|MEDICAL_HISTORY|INTAKE|OTHER",
  "fields": [
    {
      "id": "field_1",
      "type": "text|textarea|select|checkbox|radio|date|number",
      "label": "Etiqueta del campo",
      "placeholder": "Texto de ejemplo (opcional)",
      "required": true|false,
      "options": ["opción 1", "opción 2"] // solo para select/checkbox/radio
    }
  ]
}

Reglas importantes:
- Sé conversacional y amigable
- Haz preguntas claras y específicas
- No generes el formulario hasta tener suficiente información
- Incluye campos médicos relevantes y profesionales
- Usa terminología médica apropiada en español
- Siempre incluye campos de datos personales básicos (nombre, fecha de nacimiento, etc.)
- Incluye un campo de firma/consentimiento cuando sea apropiado
- Los IDs de campos deben ser únicos: field_1, field_2, etc.

Ejemplos de buenas preguntas:
- "¿Para qué procedimiento o consulta será este formulario?"
- "¿Qué información específica necesitas recopilar del paciente?"
- "¿Necesitas incluir alguna escala de evaluación o medición?"
- "¿Debe incluir sección de antecedentes familiares?"

Cuando generes el formulario, asegúrate de que sea completo, profesional y listo para usar.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Convert messages to Anthropic format
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Call Claude AI
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';

    logger.info({
      event: 'ai_form_generation',
      messageCount: messages.length,
      responseLength: aiResponse.length,
    });

    // Check if AI generated a form (look for FORM_JSON: marker)
    let generatedForm = null;
    if (aiResponse.includes('FORM_JSON:')) {
      try {
        const jsonStart = aiResponse.indexOf('FORM_JSON:') + 'FORM_JSON:'.length;
        const jsonText = aiResponse.substring(jsonStart).trim();

        // Find the JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const formData = JSON.parse(jsonMatch[0]);

          // Validate form structure
          if (formData.title && formData.fields && Array.isArray(formData.fields)) {
            generatedForm = formData;

            logger.info({
              event: 'form_generated_successfully',
              formTitle: formData.title,
              fieldCount: formData.fields.length,
            });
          }
        }
      } catch (parseError) {
        logger.error({
          event: 'form_json_parse_error',
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
        });
      }
    }

    // Remove FORM_JSON: from the response message
    let cleanMessage = aiResponse;
    if (aiResponse.includes('FORM_JSON:')) {
      cleanMessage = aiResponse.substring(0, aiResponse.indexOf('FORM_JSON:')).trim();
    }

    return NextResponse.json({
      success: true,
      message: cleanMessage || aiResponse,
      generatedForm,
    });
  } catch (error) {
    logger.error({
      event: 'ai_form_generation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la solicitud con el asistente AI.',
        message:
          'Lo siento, hubo un problema al procesar tu solicitud. Por favor, intenta de nuevo.',
      },
      { status: 500 }
    );
  }
}
