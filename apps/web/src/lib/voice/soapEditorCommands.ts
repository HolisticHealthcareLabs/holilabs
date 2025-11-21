/**
 * SOAP Editor Voice Commands Registry
 *
 * Defines all voice commands available in the SOAP editor
 *
 * Categories:
 * - Navigation: Jump between sections
 * - Content: Insert templates, text
 * - Action: Save, sign, cancel
 * - Medication: Add/remove medications
 * - Diagnosis: Add diagnoses
 */

import { VoiceCommand } from '@/hooks/useVoiceCommands';

export interface SOAPEditorCommandHandlers {
  // Navigation
  jumpToSection: (section: 'subjective' | 'objective' | 'assessment' | 'plan' | 'chief-complaint') => void;

  // Content
  insertTemplate: (templateName: string) => void;
  insertText: (section: 'chiefComplaint' | 'subjective' | 'objective' | 'assessment' | 'plan', text: string) => void;

  // Actions
  save: () => void;
  saveAndSign: () => void;
  cancel: () => void;
  startEditing: () => void;

  // Medications
  addMedication: (params: { name: string; dose?: string; frequency?: string }) => void;

  // Diagnosis
  addDiagnosis: (params: { name: string; code?: string }) => void;

  // Templates
  showTemplates: () => void;
  hideTemplates: () => void;
}

/**
 * Create SOAP editor voice commands
 */
export function createSOAPEditorCommands(
  handlers: SOAPEditorCommandHandlers
): VoiceCommand[] {
  return [
    // ========================================================================
    // Navigation Commands
    // ========================================================================
    {
      id: 'jump-to-subjective',
      patterns: [
        'jump to subjective',
        'go to subjective',
        'subjective section',
        'ir a subjetivo',
        'saltar a subjetivo',
        'ir para subjetivo',
        'pular para subjetivo',
      ],
      description: 'Jump to Subjective section',
      category: 'navigation',
      handler: () => handlers.jumpToSection('subjective'),
      examples: [
        'jump to subjective',
        'go to subjective',
        'ir a subjetivo',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'jump-to-objective',
      patterns: [
        'jump to objective',
        'go to objective',
        'objective section',
        'ir a objetivo',
        'saltar a objetivo',
        'ir para objetivo',
        'pular para objetivo',
      ],
      description: 'Jump to Objective section',
      category: 'navigation',
      handler: () => handlers.jumpToSection('objective'),
      examples: [
        'jump to objective',
        'go to objective',
        'ir a objetivo',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'jump-to-assessment',
      patterns: [
        'jump to assessment',
        'go to assessment',
        'assessment section',
        'ir a evaluación',
        'saltar a evaluación',
        'ir para avaliação',
        'pular para avaliação',
      ],
      description: 'Jump to Assessment section',
      category: 'navigation',
      handler: () => handlers.jumpToSection('assessment'),
      examples: [
        'jump to assessment',
        'go to assessment',
        'ir a evaluación',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'jump-to-plan',
      patterns: [
        'jump to plan',
        'go to plan',
        'plan section',
        'ir a plan',
        'saltar a plan',
        'ir para plano',
        'pular para plano',
      ],
      description: 'Jump to Plan section',
      category: 'navigation',
      handler: () => handlers.jumpToSection('plan'),
      examples: [
        'jump to plan',
        'go to plan',
        'ir a plan',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'jump-to-chief-complaint',
      patterns: [
        'jump to chief complaint',
        'go to chief complaint',
        'chief complaint section',
        'ir a motivo de consulta',
        'saltar a motivo de consulta',
        'ir para queixa principal',
        'pular para queixa principal',
      ],
      description: 'Jump to Chief Complaint',
      category: 'navigation',
      handler: () => handlers.jumpToSection('chief-complaint'),
      examples: [
        'jump to chief complaint',
        'go to chief complaint',
        'ir a motivo de consulta',
      ],
      languages: ['en', 'es', 'pt'],
    },

    // ========================================================================
    // Template Commands
    // ========================================================================
    {
      id: 'insert-template',
      patterns: [
        'insert template {name}',
        'add template {name}',
        'use template {name}',
        'insertar plantilla {name}',
        'agregar plantilla {name}',
        'usar plantilla {name}',
        'inserir template {name}',
        'adicionar template {name}',
        'usar template {name}',
      ],
      description: 'Insert a clinical template',
      category: 'content',
      handler: (params) => handlers.insertTemplate(params.name),
      examples: [
        'insert template chest pain',
        'add template diabetes follow up',
        'insertar plantilla dolor de pecho',
        'inserir template dor no peito',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'show-templates',
      patterns: [
        'show templates',
        'open templates',
        'template library',
        'ver plantillas',
        'mostrar plantillas',
        'abrir plantillas',
        'mostrar templates',
        'abrir templates',
        'ver templates',
      ],
      description: 'Open template library',
      category: 'content',
      handler: () => handlers.showTemplates(),
      examples: [
        'show templates',
        'open templates',
        'ver plantillas',
        'mostrar templates',
      ],
      languages: ['en', 'es', 'pt'],
    },

    // ========================================================================
    // Action Commands
    // ========================================================================
    {
      id: 'save',
      patterns: [
        'save',
        'save note',
        'save changes',
        'guardar',
        'guardar nota',
        'guardar cambios',
        'salvar',
        'salvar nota',
        'salvar alterações',
      ],
      description: 'Save the note',
      category: 'action',
      handler: () => handlers.save(),
      examples: [
        'save',
        'save note',
        'guardar',
        'salvar',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'save-and-sign',
      patterns: [
        'save and sign',
        'sign note',
        'finalize note',
        'guardar y firmar',
        'firmar nota',
        'finalizar nota',
        'salvar e assinar',
        'assinar nota',
        'finalizar nota',
      ],
      description: 'Save and sign the note',
      category: 'action',
      handler: () => handlers.saveAndSign(),
      examples: [
        'save and sign',
        'sign note',
        'guardar y firmar',
        'salvar e assinar',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'start-editing',
      patterns: [
        'start editing',
        'edit note',
        'begin editing',
        'empezar a editar',
        'editar nota',
        'comenzar a editar',
        'começar a editar',
        'editar nota',
        'iniciar edição',
      ],
      description: 'Start editing the note',
      category: 'action',
      handler: () => handlers.startEditing(),
      examples: [
        'start editing',
        'edit note',
        'editar nota',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'cancel',
      patterns: [
        'cancel',
        'cancel editing',
        'discard changes',
        'cancelar',
        'cancelar edición',
        'descartar cambios',
        'cancelar',
        'cancelar edição',
        'descartar alterações',
      ],
      description: 'Cancel editing',
      category: 'action',
      handler: () => handlers.cancel(),
      examples: [
        'cancel',
        'cancel editing',
        'cancelar',
      ],
      languages: ['en', 'es', 'pt'],
    },

    // ========================================================================
    // Medication Commands
    // ========================================================================
    {
      id: 'add-medication-full',
      patterns: [
        'add medication {name} {dose} {frequency}',
        'prescribe {name} {dose} {frequency}',
        'agregar medicamento {name} {dose} {frequency}',
        'recetar {name} {dose} {frequency}',
        'adicionar medicamento {name} {dose} {frequency}',
        'prescrever {name} {dose} {frequency}',
      ],
      description: 'Add medication with dose and frequency',
      category: 'medication',
      handler: (params) =>
        handlers.addMedication({
          name: params.name,
          dose: params.dose,
          frequency: params.frequency,
        }),
      examples: [
        'add medication aspirin 100mg daily',
        'prescribe lisinopril 10mg once daily',
        'agregar medicamento aspirina 100mg diario',
        'adicionar medicamento aspirina 100mg diário',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'add-medication-simple',
      patterns: [
        'add medication {name}',
        'prescribe {name}',
        'add med {name}',
        'agregar medicamento {name}',
        'recetar {name}',
        'adicionar medicamento {name}',
        'prescrever {name}',
      ],
      description: 'Add medication (basic)',
      category: 'medication',
      handler: (params) =>
        handlers.addMedication({
          name: params.name,
        }),
      examples: [
        'add medication aspirin',
        'prescribe lisinopril',
        'agregar medicamento aspirina',
        'adicionar medicamento aspirina',
      ],
      languages: ['en', 'es', 'pt'],
    },

    // ========================================================================
    // Diagnosis Commands
    // ========================================================================
    {
      id: 'add-diagnosis-with-code',
      patterns: [
        'add diagnosis {name} code {code}',
        'diagnose {name} code {code}',
        'agregar diagnóstico {name} código {code}',
        'diagnosticar {name} código {code}',
        'adicionar diagnóstico {name} código {code}',
        'diagnosticar {name} código {code}',
      ],
      description: 'Add diagnosis with ICD code',
      category: 'diagnosis',
      handler: (params) =>
        handlers.addDiagnosis({
          name: params.name,
          code: params.code,
        }),
      examples: [
        'add diagnosis hypertension code I10',
        'diagnose diabetes code E11',
        'agregar diagnóstico hipertensión código I10',
        'adicionar diagnóstico hipertensão código I10',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'add-diagnosis-simple',
      patterns: [
        'add diagnosis {name}',
        'diagnose {name}',
        'agregar diagnóstico {name}',
        'diagnosticar {name}',
        'adicionar diagnóstico {name}',
        'diagnosticar {name}',
      ],
      description: 'Add diagnosis (basic)',
      category: 'diagnosis',
      handler: (params) =>
        handlers.addDiagnosis({
          name: params.name,
        }),
      examples: [
        'add diagnosis hypertension',
        'diagnose diabetes',
        'agregar diagnóstico hipertensión',
        'adicionar diagnóstico hipertensão',
      ],
      languages: ['en', 'es', 'pt'],
    },

    // ========================================================================
    // Content Insertion Commands
    // ========================================================================
    {
      id: 'insert-to-subjective',
      patterns: [
        'add to subjective {text}',
        'insert in subjective {text}',
        'agregar a subjetivo {text}',
        'insertar en subjetivo {text}',
        'adicionar a subjetivo {text}',
        'inserir em subjetivo {text}',
      ],
      description: 'Insert text into Subjective section',
      category: 'content',
      handler: (params) => handlers.insertText('subjective', params.text),
      examples: [
        'add to subjective patient reports chest pain',
        'agregar a subjetivo paciente reporta dolor de pecho',
        'adicionar a subjetivo paciente relata dor no peito',
      ],
      languages: ['en', 'es', 'pt'],
    },
    {
      id: 'insert-to-plan',
      patterns: [
        'add to plan {text}',
        'insert in plan {text}',
        'agregar a plan {text}',
        'insertar en plan {text}',
        'adicionar a plano {text}',
        'inserir em plano {text}',
      ],
      description: 'Insert text into Plan section',
      category: 'content',
      handler: (params) => handlers.insertText('plan', params.text),
      examples: [
        'add to plan follow up in 2 weeks',
        'agregar a plan seguimiento en 2 semanas',
        'adicionar a plano acompanhamento em 2 semanas',
      ],
      languages: ['en', 'es', 'pt'],
    },
  ];
}

/**
 * Get command categories for display
 */
export function getCommandCategories() {
  return [
    {
      id: 'navigation',
      name: 'Navigation',
      icon: '🧭',
      description: 'Navigate between SOAP sections',
    },
    {
      id: 'content',
      name: 'Content',
      icon: '📝',
      description: 'Insert templates and text',
    },
    {
      id: 'action',
      name: 'Actions',
      icon: '⚡',
      description: 'Save, sign, and edit',
    },
    {
      id: 'medication',
      name: 'Medications',
      icon: '💊',
      description: 'Manage medications',
    },
    {
      id: 'diagnosis',
      name: 'Diagnosis',
      icon: '🩺',
      description: 'Add diagnoses',
    },
  ];
}
