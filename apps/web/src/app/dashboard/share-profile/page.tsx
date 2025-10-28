'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  CheckCheck,
  QrCode,
  Mail,
  MessageSquare,
  ExternalLink,
  Shield,
  Calendar,
  Eye,
} from 'lucide-react';

export default function ShareProfilePage() {
  // Demo user ID (in production, get from session/auth)
  const userId = 'cmh9q9dwv000014gb4knsv48j';
  const [copied, setCopied] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const bookingLink = `${baseUrl}/book/${userId}`;
  const findDoctorLink = `${baseUrl}/find-doctor`;

  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  const fetchDoctorProfile = async () => {
    try {
      const response = await fetch(`/api/doctors/${userId}/public`);
      const data = await response.json();
      if (data.success) {
        setDoctor(data.doctor);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareViaEmail = () => {
    const subject = encodeURIComponent('Book an Appointment with Me');
    const body = encodeURIComponent(
      `Hi,\n\nI'd like to invite you to book an appointment with me directly through my online booking page:\n\n${bookingLink}\n\nBest regards`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleShareViaSMS = () => {
    const message = encodeURIComponent(
      `Book an appointment with me: ${bookingLink}`
    );
    window.open(`sms:?body=${message}`);
  };

  const handleShareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Book an appointment with me: ${bookingLink}`
    );
    window.open(`https://wa.me/?text=${message}`);
  };

  const handlePreview = () => {
    window.open(bookingLink, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="text-gray-600 mt-4">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Your Profile</h1>
          <p className="text-gray-600">
            Share your booking link with patients to let them schedule appointments directly
          </p>
        </div>

        {/* Profile Preview Card */}
        {doctor && (
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">{doctor.name}</h2>
                <p className="text-green-100 mb-4">{doctor.specialty}</p>
                {doctor.isVerified && (
                  <div className="inline-flex items-center bg-white/20 rounded-full px-3 py-1 text-sm">
                    <Shield className="w-4 h-4 mr-2" />
                    {doctor.verifiedCredentials} Verified Credentials
                  </div>
                )}
              </div>
              <button
                onClick={handlePreview}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
            </div>
          </div>
        )}

        {/* Booking Link Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Share2 className="w-5 h-5 mr-2 text-green-600" />
            Your Booking Link
          </h2>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <code className="text-sm text-gray-700 flex-1 break-all">{bookingLink}</code>
              <button
                onClick={handleCopyLink}
                className="ml-4 flex-shrink-0 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center"
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-green-600 text-sm">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    <span className="text-sm">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleShareViaEmail}
              className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Share via Email</span>
            </button>

            <button
              onClick={handleShareViaSMS}
              className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Share via SMS</span>
            </button>

            <button
              onClick={handleShareViaWhatsApp}
              className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Share via WhatsApp</span>
            </button>

            <button
              onClick={handlePreview}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="font-medium">Open Link</span>
            </button>
          </div>
        </div>

        {/* Find Doctor Link */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Doctor Directory</h2>
          <p className="text-gray-600 mb-4">
            You're also listed in our public doctor directory where patients can search and find you.
          </p>
          <a
            href={findDoctorLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
          >
            View Directory
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </div>

        {/* Tips Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Tips for Sharing</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>Add this link to your email signature</span>
            </li>
            <li className="flex items-start">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>Share it on your social media profiles</span>
            </li>
            <li className="flex items-start">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>Include it in your business cards and marketing materials</span>
            </li>
            <li className="flex items-start">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>Send it directly to patients after consultations</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
