'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import DashboardLayout from '@/components/DashboardLayout';
import PatientSearch from '@/components/PatientSearch';
import confetti from 'canvas-confetti';

const PATIENTS = [
  { id: 'pt-001', name: 'María González', age: '45-54', emoji: '👩' },
  { id: 'pt-002', name: 'Carlos Silva', age: '60-69', emoji: '👨' },
  { id: 'pt-003', name: 'Ana Rodríguez', age: '30-39', emoji: '👩‍🦰' },
];

type UploadStep = 'select' | 'upload' | 'assign' | 'confirm';

export default function UploadPage() {
  const t = useTranslations('dashboard.upload');
  const [step, setStep] = useState<UploadStep>('select');
  const [selectedPatient, setSelectedPatient] = useState<typeof PATIENTS[0] | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [newPatientData, setNewPatientData] = useState({
    firstName: '',
    lastName: '',
    birthYear: '',
    condition: '',
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleSelectPatient = (patientId: string) => {
    const patient = PATIENTS.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setIsNewPatient(false);
      setStep('upload');
    }
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setStep('assign');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const triggerConfetti = () => {
    const count = 200;
    const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
        colors: ['#38F2AE', '#014751', '#6D4751', '#EAECF2'],
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const handleAssignToWallet = () => {
    setStep('confirm');
    setTimeout(() => {
      triggerConfetti();
      setTimeout(() => {
        alert(t('successAssigned', { name: selectedPatient?.name || t('newPatientLabel') }));
        setStep('select');
        setSelectedPatient(null);
        setUploadedFile(null);
        setIsNewPatient(false);
      }, 500);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">📄 {t('title')}</h2>

        {/* Progress Stepper */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-8">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              <div className={`flex items-center ${step === 'select' ? 'text-primary font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                  step === 'select' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  1
                </div>
                <span className="hidden md:inline">{t('stepSelectPatient')}</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-4" />
              <div className={`flex items-center ${step === 'upload' || step === 'assign' || step === 'confirm' ? 'text-primary font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                  step === 'upload' || step === 'assign' || step === 'confirm' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  2
                </div>
                <span className="hidden md:inline">{t('stepUploadDocument')}</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-4" />
              <div className={`flex items-center ${step === 'assign' || step === 'confirm' ? 'text-primary font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                  step === 'assign' || step === 'confirm' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  3
                </div>
                <span className="hidden md:inline">{t('stepAssignWallet')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Select Patient */}
          {step === 'select' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('selectOrCreateTitle')}</h2>

              <div className="space-y-6">
                <button
                  onClick={() => {
                    setIsNewPatient(true);
                    setStep('upload');
                  }}
                  className="w-full p-6 border-2 border-dashed border-primary rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">➕</div>
                    <div>
                      <div className="font-bold text-lg text-primary">{t('createNewPatient')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('registerAndAssign')}</div>
                    </div>
                  </div>
                </button>

                <div className="my-6 flex items-center">
                  <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
                  <span className="px-4 text-gray-500 dark:text-gray-400">{t('orSelectExisting')}</span>
                  <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
                </div>

                <PatientSearch onSelectPatient={handleSelectPatient} showMostViewed={true} />
              </div>
            </div>
          )}

          {/* Step 2: Upload Document */}
          {step === 'upload' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('uploadTitle')}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {isNewPatient ? t('newPatientLabel') : t('forPatient', { name: selectedPatient?.name ?? '' })}
              </p>

              {isNewPatient && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                  <h3 className="font-bold mb-3 text-gray-900 dark:text-white">{t('newPatientData')}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder={t('firstName')}
                      value={newPatientData.firstName}
                      onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                    />
                    <input
                      type="text"
                      placeholder={t('lastName')}
                      value={newPatientData.lastName}
                      onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                    />
                    <input
                      type="text"
                      placeholder={t('birthYear')}
                      value={newPatientData.birthYear}
                      onChange={(e) => setNewPatientData({ ...newPatientData, birthYear: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                    />
                    <input
                      type="text"
                      placeholder={t('mainCondition')}
                      value={newPatientData.condition}
                      onChange={(e) => setNewPatientData({ ...newPatientData, condition: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                    />
                  </div>
                </div>
              )}

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-4 border-dashed rounded-lg p-12 text-center transition ${
                  isDragging ? 'border-primary bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{t('dragHere')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{t('or')}</p>
                <label className="inline-block px-6 py-3 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90">
                  <input
                    type="file"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    accept=".pdf,.jpg,.png,.dicom,.csv"
                  />
                  {t('selectFile')}
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  {t('supportedFormats')}
                </p>
              </div>

              {uploadedFile && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">✓</div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">{uploadedFile.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex space-x-2">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {t('back')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Assign to Wallet */}
          {step === 'assign' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('confirmTitle')}</h2>

              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                  <h3 className="font-bold mb-2 text-gray-900 dark:text-white">📄 {t('documentSection')}</h3>
                  <p className="text-gray-900 dark:text-white">{uploadedFile?.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{(uploadedFile!.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/50 rounded-lg">
                  <h3 className="font-bold mb-2 text-gray-900 dark:text-white">
                    {isNewPatient ? `👤 ${t('newPatientSection')}` : `${selectedPatient?.emoji} ${t('patientSection')}`}
                  </h3>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {isNewPatient
                      ? `${newPatientData.firstName} ${newPatientData.lastName}`
                      : selectedPatient?.name}
                  </p>
                  {!isNewPatient && <p className="text-sm text-gray-600 dark:text-gray-400">ID: {selectedPatient?.id}</p>}
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
                  <h3 className="font-bold text-yellow-900 dark:text-yellow-300 mb-2">🔒 {t('deidentProcess')}</h3>
                  <ol className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1 ml-4 list-decimal">
                    <li>{t('deidentStep1')}</li>
                    <li>{t('deidentStep2')}</li>
                    <li>{t('deidentStep3')}</li>
                    <li>{t('deidentStep4')}</li>
                    <li>{t('deidentStep5')}</li>
                  </ol>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setStep('upload')}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {t('back')}
                  </button>
                  <button
                    onClick={handleAssignToWallet}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold"
                  >
                    {t('assignToWallet')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('processingTitle')}</h2>
              <p className="text-gray-600 dark:text-gray-400">{t('processingDesc')}</p>
              <div className="mt-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
