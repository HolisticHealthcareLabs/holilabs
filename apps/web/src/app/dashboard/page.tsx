'use client';

import DashboardLayout from '@/components/DashboardLayout';
import PatientSearch from '@/components/PatientSearch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();

  const handleSelectPatient = (patientId: string) => {
    router.push(`/dashboard/patients/${patientId}`);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Doctor's Dashboard</h2>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold text-primary">127</p>
              </div>
              <svg className="w-12 h-12 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Consultations</p>
                <p className="text-3xl font-bold text-primary">38</p>
              </div>
              <svg className="w-12 h-12 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.183l1.562-1.562C15.802 8.249 16 9.1 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.796a4.002 4.002 0 01-.041-2.08l-.08.08-1.53-1.533A5.98 5.98 0 004 10c0 .954.223 1.856.619 2.657l1.54-1.54zm1.088-6.45A5.974 5.974 0 0110 4c.954 0 1.856.223 2.657.619l-1.54 1.54a4.002 4.002 0 00-2.346.033L7.246 4.668zM12 10a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Documents Uploaded</p>
                <p className="text-3xl font-bold text-primary">284</p>
              </div>
              <svg className="w-12 h-12 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Patient Search Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Find Patients</h3>
          <div className="bg-white rounded-lg shadow-md p-6">
            <PatientSearch onSelectPatient={handleSelectPatient} showMostViewed={true} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/dashboard/upload" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center space-x-4">
              <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <h4 className="font-bold text-gray-800">Upload Document</h4>
                <p className="text-sm text-gray-600">Add new patient files</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/ai" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center space-x-4">
              <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <h4 className="font-bold text-gray-800">AI Assistant</h4>
                <p className="text-sm text-gray-600">Chat with AI about patients</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/patients" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center space-x-4">
              <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <div>
                <h4 className="font-bold text-gray-800">All Patients</h4>
                <p className="text-sm text-gray-600">View full patient list</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
