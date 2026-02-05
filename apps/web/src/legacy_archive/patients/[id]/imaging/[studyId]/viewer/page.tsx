'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled to prevent Node.js module bundling
const CornerstoneDicomViewer = dynamic(
  () => import('@/components/imaging/CornerstoneDicomViewer').then(mod => mod.CornerstoneDicomViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p>Loading DICOM viewer...</p>
        </div>
      </div>
    )
  }
);

interface StudyData {
  id: string;
  studyInstanceUID: string | null;
  modality: string;
  bodyPart: string;
  description: string;
  studyDate: string;
  imageCount: number;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function DicomViewerPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = (params?.id as string) || '';
  const studyId = (params?.studyId as string) || '';

  const [study, setStudy] = useState<StudyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudy() {
      try {
        setLoading(true);
        // Fetch study metadata from the API
        const response = await fetch(`/api/imaging?patientId=${patientId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch study');
        }

        const data = await response.json();
        const studyData = data.data?.find(
          (s: any) => s.id === studyId || s.studyInstanceUID === studyId
        );

        if (!studyData) {
          throw new Error('Study not found');
        }

        setStudy(studyData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStudy();
  }, [patientId, studyId]);

  const handleClose = () => {
    router.push(`/dashboard/patients/${patientId}/imaging`);
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p>Loading DICOM viewer...</p>
        </div>
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Study not found'}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <CornerstoneDicomViewer
        studyId={study.id}
        studyInstanceUID={study.studyInstanceUID || undefined}
        patientName={`${study.patient.lastName}, ${study.patient.firstName}`}
        modality={study.modality}
        bodyPart={study.bodyPart}
        studyDate={new Date(study.studyDate).toLocaleDateString()}
        onClose={handleClose}
      />
    </div>
  );
}
