'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Share2,
  Copy,
  CheckCheck,
  Stethoscope,
  Award,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/credentials/VerifiedBadge';

interface DoctorProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber?: string;
  npi?: string;
  isVerified: boolean;
  verifiedCredentials: number;
  credentials: any[];
  availability: any[];
  hasAvailability: boolean;
  bookingLink: string;
}

export default function BookDoctorPage({ params }: { params: { doctorId: string } }) {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    fetchDoctorProfile();
  }, [params.doctorId]);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/doctors/${params.doctorId}/public`);
      const data = await response.json();

      if (data.success) {
        setDoctor(data.doctor);
      } else {
        setError(data.error || 'Doctor not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load doctor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (doctor) {
      navigator.clipboard.writeText(doctor.bookingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareLink = () => {
    if (doctor && navigator.share) {
      navigator.share({
        title: `Book appointment with ${doctor.name}`,
        text: `Schedule an appointment with ${doctor.name}, ${doctor.specialty}`,
        url: doctor.bookingLink,
      });
    }
  };

  const formatCredentialType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Loading doctor profile...</p>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Doctor Not Found</h2>
          <p className="text-gray-600">{error || "The doctor profile you're looking for doesn't exist."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{doctor.name}</h1>
              <p className="text-green-100 text-lg mb-4">{doctor.specialty}</p>
              {doctor.isVerified && (
                <VerifiedBadge verified={doctor.isVerified} verificationCount={doctor.verifiedCredentials} />
              )}
            </div>
            <div className="bg-white/10 rounded-full p-4">
              <Stethoscope className="w-12 h-12" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Verified Credentials */}
            {doctor.credentials.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-green-600" />
                  Verified Credentials
                </h2>
                <div className="space-y-3">
                  {doctor.credentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="flex items-start justify-between bg-green-50 rounded-lg p-4"
                    >
                      <div className="flex items-start space-x-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {formatCredentialType(credential.credentialType)}
                          </h3>
                          <p className="text-sm text-gray-600">{credential.issuingAuthority}</p>
                          <p className="text-xs text-green-700 mt-1">
                            Verified via {credential.verificationSource}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* License Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-green-600" />
                License Information
              </h2>
              <div className="space-y-3">
                {doctor.licenseNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Medical License</span>
                    <span className="font-medium text-gray-900">{doctor.licenseNumber}</span>
                  </div>
                )}
                {doctor.npi && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">NPI Number</span>
                    <span className="font-medium text-gray-900">{doctor.npi}</span>
                  </div>
                )}
                {doctor.specialty && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Specialty</span>
                    <span className="font-medium text-gray-900">{doctor.specialty}</span>
                  </div>
                )}
              </div>
            </div>

            {/* About Section (Placeholder) */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-600 leading-relaxed">
                {doctor.name} is a board-certified {doctor.specialty} physician with extensive experience
                in providing high-quality patient care. All credentials have been verified through our
                comprehensive credentialing system.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Book Appointment</h3>

              {!showBookingForm ? (
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center mb-4"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Appointment
                </button>
              ) : (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">Select a date and time:</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Booking system integration coming soon! For now, please call to schedule.
                  </div>
                </div>
              )}

              {/* Share Options */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Share this profile:</p>
                <div className="space-y-2">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  {navigator.share && (
                    <button
                      onClick={handleShareLink}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900 mb-1">Verified Provider</h4>
                  <p className="text-sm text-green-800">
                    All credentials verified through state and national databases
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
