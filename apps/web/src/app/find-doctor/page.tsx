'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Stethoscope, Shield, CheckCircle2, Star, Calendar } from 'lucide-react';
import Link from 'next/link';
import { VerifiedBadge } from '@/components/credentials/VerifiedBadge';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber?: string;
  npi?: string;
  isVerified: boolean;
  verifiedCredentials: number;
  totalCredentials: number;
  verificationPercentage: number;
}

export default function FindDoctorPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const specialties = [
    'Internal Medicine',
    'Family Medicine',
    'Pediatrics',
    'Cardiology',
    'Dermatology',
    'Orthopedics',
    'Psychiatry',
    'Obstetrics & Gynecology',
    'General Surgery',
    'Neurology',
    'Emergency Medicine',
    'Anesthesiology',
  ];

  // Fetch doctors
  useEffect(() => {
    fetchDoctors();
  }, [searchQuery, selectedSpecialty, verifiedOnly, page]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedSpecialty) params.append('specialty', selectedSpecialty);
      if (verifiedOnly) params.append('verified', 'true');
      params.append('page', page.toString());
      params.append('limit', '12');

      const response = await fetch(`/api/doctors/search?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setDoctors(data.doctors);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDoctors();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-4">Find a Doctor</h1>
          <p className="text-green-100 text-lg">
            Search for verified healthcare providers in your area
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-6 -mt-8">
        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Name Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Doctor name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Specialty Filter */}
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedSpecialty}
                onChange={(e) => {
                  setSelectedSpecialty(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
              >
                <option value="">All Specialties</option>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Location (Placeholder) */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Location (coming soon)"
                disabled
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Verified Filter */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => {
                  setVerifiedOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Show verified providers only</span>
            </label>

            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="text-gray-600 mt-4">Searching...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No doctors found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Found <span className="font-semibold text-gray-900">{doctors.length}</span> doctors
              </p>
            </div>

            {/* Doctor Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <Link
                  key={doctor.id}
                  href={`/book/${doctor.id}`}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 rounded-full p-3">
                        <Stethoscope className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{doctor.specialty}</p>
                      </div>
                    </div>
                  </div>

                  {/* Verification Status */}
                  {doctor.isVerified && (
                    <div className="mb-4">
                      <VerifiedBadge
                        verified={doctor.isVerified}
                        verificationCount={doctor.verifiedCredentials}
                        size="sm"
                      />
                    </div>
                  )}

                  {/* License Info */}
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    {doctor.licenseNumber && (
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-gray-400" />
                        <span>License: {doctor.licenseNumber}</span>
                      </div>
                    )}
                    {doctor.npi && (
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-gray-400" />
                        <span>NPI: {doctor.npi}</span>
                      </div>
                    )}
                  </div>

                  {/* Book Button */}
                  <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Appointment
                  </button>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8 space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
