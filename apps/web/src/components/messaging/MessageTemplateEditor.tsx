'use client';

/**
 * Message Template Editor
 * Create and customize automated reminder templates
 * FREE - No external SMS service needed (outputs templates for integration)
 *
 * Features:
 * - Pre-built template library
 * - Custom template creation
 * - Variable insertion (patient name, date, time, etc.)
 * - Live preview with sample data
 * - Template categories
 * - Save/edit/delete templates
 * - Beautiful, intuitive UI
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PatientSelectorModal from './PatientSelectorModal';
import ScheduleReminderModal, { ScheduleData } from './ScheduleReminderModal';

interface MessageTemplate {
  id: string;
  name: string;
  category: 'appointment' | 'medication' | 'lab' | 'follow-up' | 'general';
  subject?: string;
  message: string;
  variables: string[];
  isDefault: boolean;
  createdAt: Date;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'apt-reminder-24h',
    name: 'Appointment Reminder (24h)',
    category: 'appointment',
    subject: 'Appointment Reminder - Tomorrow',
    message: 'Hi {{patient_name}}, this is a friendly reminder about your appointment tomorrow at {{appointment_time}} with {{provider_name}}. Please arrive 15 minutes early. Reply CONFIRM to confirm or call us at {{clinic_phone}} if you need to reschedule.',
    variables: ['patient_name', 'appointment_time', 'provider_name', 'clinic_phone'],
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: 'apt-reminder-1h',
    name: 'Appointment Reminder (1 hour)',
    category: 'appointment',
    message: 'Hi {{patient_name}}, your appointment with {{provider_name}} is in 1 hour at {{appointment_time}}. See you soon! {{clinic_address}}',
    variables: ['patient_name', 'provider_name', 'appointment_time', 'clinic_address'],
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: 'med-reminder-daily',
    name: 'Daily Medication Reminder',
    category: 'medication',
    message: 'Hi {{patient_name}}, remember to take your {{medication_name}} ({{dosage}}). Stay healthy! 💊',
    variables: ['patient_name', 'medication_name', 'dosage'],
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: 'med-refill',
    name: 'Medication Refill Reminder',
    category: 'medication',
    message: 'Hi {{patient_name}}, your {{medication_name}} prescription is running low. You have {{days_remaining}} days of medication left. Please call us at {{clinic_phone}} to request a refill.',
    variables: ['patient_name', 'medication_name', 'days_remaining', 'clinic_phone'],
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: 'lab-ready',
    name: 'Lab Results Ready',
    category: 'lab',
    subject: 'Your Lab Results Are Ready',
    message: 'Hi {{patient_name}}, your lab results from {{test_date}} are now available. Please log in to your patient portal to view them, or call us at {{clinic_phone}} to discuss with {{provider_name}}.',
    variables: ['patient_name', 'test_date', 'clinic_phone', 'provider_name'],
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: 'follow-up',
    name: 'Follow-up Care Reminder',
    category: 'follow-up',
    message: 'Hi {{patient_name}}, it\'s time to schedule your follow-up appointment with {{provider_name}}. Please call us at {{clinic_phone}} or book online at {{booking_link}}.',
    variables: ['patient_name', 'provider_name', 'clinic_phone', 'booking_link'],
    isDefault: true,
    createdAt: new Date(),
  },
];

const AVAILABLE_VARIABLES = [
  { key: 'patient_name', label: 'Patient Name', example: 'John Smith' },
  { key: 'provider_name', label: 'Provider Name', example: 'Dr. Garcia' },
  { key: 'appointment_date', label: 'Appointment Date', example: 'Jan 15, 2025' },
  { key: 'appointment_time', label: 'Appointment Time', example: '2:00 PM' },
  { key: 'medication_name', label: 'Medication Name', example: 'Metformin' },
  { key: 'dosage', label: 'Dosage', example: '500mg' },
  { key: 'clinic_phone', label: 'Clinic Phone', example: '(555) 123-4567' },
  { key: 'clinic_address', label: 'Clinic Address', example: '123 Health St' },
  { key: 'booking_link', label: 'Booking Link', example: 'holilabs.xyz/book' },
  { key: 'test_date', label: 'Test Date', example: 'Jan 10, 2025' },
  { key: 'days_remaining', label: 'Days Remaining', example: '5' },
];

export default function MessageTemplateEditor() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<MessageTemplate>>({});
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showPreview, setShowPreview] = useState(false);

  // Send functionality state
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [templateToSend, setTemplateToSend] = useState<MessageTemplate | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [templateToSchedule, setTemplateToSchedule] = useState<MessageTemplate | null>(null);

  const categories = [
    { value: 'all', label: 'All Templates', icon: '📋', count: templates.length },
    { value: 'appointment', label: 'Appointments', icon: '📅', count: templates.filter(t => t.category === 'appointment').length },
    { value: 'medication', label: 'Medications', icon: '💊', count: templates.filter(t => t.category === 'medication').length },
    { value: 'lab', label: 'Lab Results', icon: '🔬', count: templates.filter(t => t.category === 'lab').length },
    { value: 'follow-up', label: 'Follow-ups', icon: '🔄', count: templates.filter(t => t.category === 'follow-up').length },
  ];

  const filteredTemplates = activeCategory === 'all'
    ? templates
    : templates.filter(t => t.category === activeCategory);

  const handleCreateNew = () => {
    setEditingTemplate({
      id: `custom-${Date.now()}`,
      name: 'New Template',
      category: 'general',
      message: '',
      variables: [],
      isDefault: false,
      createdAt: new Date(),
    });
    setIsEditing(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate({ ...template });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editingTemplate.name || !editingTemplate.message) return;

    const template = editingTemplate as MessageTemplate;
    const existingIndex = templates.findIndex(t => t.id === template.id);

    if (existingIndex >= 0) {
      const updated = [...templates];
      updated[existingIndex] = template;
      setTemplates(updated);
    } else {
      setTemplates([...templates, template]);
    }

    setIsEditing(false);
    setEditingTemplate({});
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id));
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
    }
  };

  const insertVariable = (variableKey: string) => {
    const currentMessage = editingTemplate.message || '';
    const newMessage = currentMessage + `{{${variableKey}}}`;

    setEditingTemplate({
      ...editingTemplate,
      message: newMessage,
      variables: [...new Set([...(editingTemplate.variables || []), variableKey])],
    });
  };

  // Send handlers
  const handleSendClick = (template: MessageTemplate) => {
    setTemplateToSend(template);
    setShowPatientSelector(true);
    setSendResult(null);
  };

  const handleSendReminder = async (
    patients: any[],
    channel: 'SMS' | 'EMAIL' | 'WHATSAPP'
  ) => {
    if (!templateToSend) return;

    try {
      setSending(true);

      const response = await fetch('/api/reminders/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientIds: patients.map((p) => p.id),
          template: {
            name: templateToSend.name,
            category: templateToSend.category,
            subject: templateToSend.subject,
            message: templateToSend.message,
            variables: templateToSend.variables,
          },
          channel,
          sendImmediately: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSendResult({
          success: true,
          message: data.message || `Sent to ${patients.length} patient(s)!`,
        });

        // Auto-hide success message after 5 seconds
        setTimeout(() => setSendResult(null), 5000);
      } else {
        setSendResult({
          success: false,
          message: data.error || 'Failed to send reminders',
        });
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      setSendResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  // Handle schedule click
  const handleScheduleClick = (template: MessageTemplate) => {
    setTemplateToSchedule(template);
    setShowScheduleModal(true);
    setSendResult(null);
  };

  // Handle schedule reminder
  const handleScheduleReminder = async (scheduleData: ScheduleData) => {
    if (!templateToSchedule) return;

    try {
      setSending(true);

      const response = await fetch('/api/reminders/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientIds: scheduleData.patients.map((p) => p.id),
          template: {
            name: templateToSchedule.name,
            category: templateToSchedule.category,
            subject: templateToSchedule.subject,
            message: templateToSchedule.message,
            variables: templateToSchedule.variables,
          },
          channel: scheduleData.channel,
          scheduledFor: scheduleData.scheduledFor.toISOString(),
          recurrence: scheduleData.recurrence,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSendResult({
          success: true,
          message: data.message || `Reminder scheduled for ${scheduleData.patients.length} patient(s)!`,
        });

        // Auto-hide success message after 5 seconds
        setTimeout(() => setSendResult(null), 5000);
      } else {
        setSendResult({
          success: false,
          message: data.error || 'Failed to schedule reminder',
        });
      }
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      setSendResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const renderPreview = (template: MessageTemplate) => {
    let preview = template.message;
    AVAILABLE_VARIABLES.forEach(variable => {
      preview = preview.replace(
        new RegExp(`{{${variable.key}}}`, 'g'),
        `<span class="bg-blue-100 text-blue-700 px-1 rounded font-semibold">${variable.example}</span>`
      );
    });
    return preview;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Message Templates</h1>
          <p className="text-gray-600">Create and manage automated reminder templates for your patients</p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(category => (
            <button
              key={category.value}
              onClick={() => setActiveCategory(category.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeCategory === category.value
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.label}
              <span className="ml-2 text-sm opacity-75">({category.count})</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Templates</h2>
                <button
                  onClick={handleCreateNew}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  + New
                </button>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredTemplates.map(template => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm text-gray-900">{template.name}</h3>
                      {template.isDefault && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{template.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendClick(template);
                          }}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                          title="Send now"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScheduleClick(template);
                          }}
                          className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                          title="Schedule for later"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(template);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Edit template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!template.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.id);
                            }}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Template Editor / Preview */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingTemplate.isDefault ? 'Edit Template' : 'Create Template'}
                    </h2>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Template Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.name || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Appointment Reminder (24h)"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={editingTemplate.category || 'general'}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="appointment">Appointment</option>
                        <option value="medication">Medication</option>
                        <option value="lab">Lab Results</option>
                        <option value="follow-up">Follow-up</option>
                        <option value="general">General</option>
                      </select>
                    </div>

                    {/* Subject (optional for emails) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Subject (Optional - for emails)
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.subject || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Appointment Reminder"
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Message
                      </label>
                      <textarea
                        value={editingTemplate.message || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="Type your message here... Use {{variable_name}} to insert dynamic data."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Click variables below to insert them into your message
                      </p>
                    </div>

                    {/* Available Variables */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Available Variables (Click to insert)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_VARIABLES.map(variable => (
                          <button
                            key={variable.key}
                            onClick={() => insertVariable(variable.key)}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                          >
                            {variable.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSave}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Save Template
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : selectedTemplate ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(selectedTemplate)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      {!selectedTemplate.isDefault && (
                        <button
                          onClick={() => handleDelete(selectedTemplate.id)}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Template Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Category</p>
                        <p className="font-semibold text-gray-900 capitalize">{selectedTemplate.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Variables Used</p>
                        <p className="font-semibold text-gray-900">{selectedTemplate.variables.length}</p>
                      </div>
                    </div>

                    {selectedTemplate.subject && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Subject</p>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-gray-900">{selectedTemplate.subject}</p>
                        </div>
                      </div>
                    )}

                    {/* Message Content */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Message Template</p>
                      <div className="p-4 bg-gray-50 rounded-lg font-mono text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedTemplate.message}
                      </div>
                    </div>

                    {/* Preview with Sample Data */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Preview with Sample Data</p>
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                        <div
                          className="text-gray-900"
                          dangerouslySetInnerHTML={{ __html: renderPreview(selectedTemplate) }}
                        />
                      </div>
                    </div>

                    {/* Variables List */}
                    {selectedTemplate.variables.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Variables in This Template</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.variables.map(varKey => {
                            const variable = AVAILABLE_VARIABLES.find(v => v.key === varKey);
                            return variable ? (
                              <span
                                key={varKey}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                              >
                                {variable.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
                >
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Template</h3>
                  <p className="text-gray-600 mb-4">
                    Choose a template from the list to preview or edit it
                  </p>
                  <button
                    onClick={handleCreateNew}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Create New Template
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Patient Selector Modal */}
      <PatientSelectorModal
        isOpen={showPatientSelector}
        onClose={() => setShowPatientSelector(false)}
        onConfirm={handleSendReminder}
      />

      <ScheduleReminderModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onConfirm={handleScheduleReminder}
        template={templateToSchedule}
      />

      {/* Success/Error Toast */}
      <AnimatePresence>
        {sendResult && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div
              className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${
                sendResult.success
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {sendResult.success ? (
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <div>
                <p className="font-semibold">{sendResult.success ? 'Success!' : 'Error'}</p>
                <p className="text-sm opacity-90">{sendResult.message}</p>
              </div>
              <button
                onClick={() => setSendResult(null)}
                className="ml-4 p-1 hover:bg-white/20 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {sending && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600" />
            <p className="text-lg font-semibold text-gray-900">Sending reminders...</p>
            <p className="text-sm text-gray-600">This may take a moment</p>
          </div>
        </div>
      )}
    </div>
  );
}
