'use client';

import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface CredentialFormProps {
  onSubmit: (data: CredentialFormData) => void;
  onCancel: () => void;
  initialData?: Partial<CredentialFormData>;
  documentUrl?: string;
  ocrData?: any;
}

export interface CredentialFormData {
  credentialType: string;
  credentialNumber: string;
  issuingAuthority: string;
  issuingCountry: string;
  issuingState?: string;
  issuedDate: string;
  expirationDate?: string;
  neverExpires: boolean;
}

export const CredentialForm: React.FC<CredentialFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  documentUrl,
  ocrData,
}) => {
  const [formData, setFormData] = useState<CredentialFormData>({
    credentialType: initialData?.credentialType || '',
    credentialNumber: initialData?.credentialNumber || '',
    issuingAuthority: initialData?.issuingAuthority || '',
    issuingCountry: initialData?.issuingCountry || 'US',
    issuingState: initialData?.issuingState || '',
    issuedDate: initialData?.issuedDate || '',
    expirationDate: initialData?.expirationDate || '',
    neverExpires: initialData?.neverExpires || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const credentialTypes = [
    { value: 'MEDICAL_LICENSE', label: 'Medical License' },
    { value: 'BOARD_CERTIFICATION', label: 'Board Certification' },
    { value: 'DEA_LICENSE', label: 'DEA License' },
    { value: 'NPI', label: 'NPI (National Provider Identifier)' },
    { value: 'MEDICAL_DEGREE', label: 'Medical Degree (MD, DO, MBBS)' },
    { value: 'SPECIALTY_FELLOWSHIP', label: 'Specialty Fellowship' },
    { value: 'HOSPITAL_PRIVILEGES', label: 'Hospital Privileges' },
    { value: 'MALPRACTICE_INSURANCE', label: 'Malpractice Insurance' },
    { value: 'BLS_CERTIFICATION', label: 'BLS Certification' },
    { value: 'ACLS_CERTIFICATION', label: 'ACLS Certification' },
    { value: 'CME_CREDITS', label: 'CME Credits' },
    { value: 'OTHER', label: 'Other' },
  ];

  const countries = [
    { value: 'US', label: 'United States' },
    { value: 'MX', label: 'Mexico' },
    { value: 'CA', label: 'Canada' },
    { value: 'CO', label: 'Colombia' },
    { value: 'AR', label: 'Argentina' },
    { value: 'BR', label: 'Brazil' },
    { value: 'CL', label: 'Chile' },
    { value: 'OTHER', label: 'Other' },
  ];

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.credentialType) {
      newErrors.credentialType = 'Credential type is required';
    }
    if (!formData.credentialNumber) {
      newErrors.credentialNumber = 'Credential number is required';
    }
    if (!formData.issuingAuthority) {
      newErrors.issuingAuthority = 'Issuing authority is required';
    }
    if (!formData.issuingCountry) {
      newErrors.issuingCountry = 'Issuing country is required';
    }
    if (!formData.issuedDate) {
      newErrors.issuedDate = 'Issue date is required';
    }
    if (!formData.neverExpires && !formData.expirationDate) {
      newErrors.expirationDate = 'Expiration date is required (or check "Never Expires")';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Credential Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Credential Type */}
        <div className="md:col-span-2">
          <label htmlFor="credentialType" className="block text-sm font-medium text-gray-700 mb-1">
            Credential Type *
          </label>
          <select
            id="credentialType"
            name="credentialType"
            value={formData.credentialType}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.credentialType ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select credential type...</option>
            {credentialTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.credentialType && (
            <p className="mt-1 text-xs text-red-600">{errors.credentialType}</p>
          )}
        </div>

        {/* Credential Number */}
        <div className="md:col-span-2">
          <label htmlFor="credentialNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Credential Number *
          </label>
          <input
            type="text"
            id="credentialNumber"
            name="credentialNumber"
            value={formData.credentialNumber}
            onChange={handleChange}
            placeholder="e.g., 12345678"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.credentialNumber ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.credentialNumber && (
            <p className="mt-1 text-xs text-red-600">{errors.credentialNumber}</p>
          )}
        </div>

        {/* Issuing Authority */}
        <div className="md:col-span-2">
          <label htmlFor="issuingAuthority" className="block text-sm font-medium text-gray-700 mb-1">
            Issuing Authority *
          </label>
          <input
            type="text"
            id="issuingAuthority"
            name="issuingAuthority"
            value={formData.issuingAuthority}
            onChange={handleChange}
            placeholder="e.g., California Medical Board"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.issuingAuthority ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.issuingAuthority && (
            <p className="mt-1 text-xs text-red-600">{errors.issuingAuthority}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label htmlFor="issuingCountry" className="block text-sm font-medium text-gray-700 mb-1">
            Country *
          </label>
          <select
            id="issuingCountry"
            name="issuingCountry"
            value={formData.issuingCountry}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.issuingCountry ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {countries.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
          {errors.issuingCountry && (
            <p className="mt-1 text-xs text-red-600">{errors.issuingCountry}</p>
          )}
        </div>

        {/* State (US only) */}
        {formData.issuingCountry === 'US' && (
          <div>
            <label htmlFor="issuingState" className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              id="issuingState"
              name="issuingState"
              value={formData.issuingState}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select state...</option>
              {usStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Issue Date */}
        <div>
          <label htmlFor="issuedDate" className="block text-sm font-medium text-gray-700 mb-1">
            Issue Date *
          </label>
          <input
            type="date"
            id="issuedDate"
            name="issuedDate"
            value={formData.issuedDate}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors.issuedDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.issuedDate && (
            <p className="mt-1 text-xs text-red-600">{errors.issuedDate}</p>
          )}
        </div>

        {/* Expiration Date */}
        <div>
          <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-1">
            Expiration Date {!formData.neverExpires && '*'}
          </label>
          <input
            type="date"
            id="expirationDate"
            name="expirationDate"
            value={formData.expirationDate}
            onChange={handleChange}
            disabled={formData.neverExpires}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              errors.expirationDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.expirationDate && !formData.neverExpires && (
            <p className="mt-1 text-xs text-red-600">{errors.expirationDate}</p>
          )}
        </div>

        {/* Never Expires */}
        <div className="md:col-span-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="neverExpires"
              checked={formData.neverExpires}
              onChange={handleChange}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">This credential never expires</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 mt-6">
        <button
          type="submit"
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Credential
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>
      </div>
    </form>
  );
};
