import DiagnosisAssistant from '@/components/clinical/DiagnosisAssistant';
export const dynamic = 'force-dynamic';


export const metadata = {
  title: 'AI Diagnosis | Holi Labs',
  description: 'AI clinical recommendations',
};

export default function DiagnosisPage() {
  return <DiagnosisAssistant />;
}
