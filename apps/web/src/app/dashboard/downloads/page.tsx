import { DownloadClient } from '@/components/download/DownloadClient';

export const metadata = {
  title: 'Downloads - Holi Labs',
  description: 'Download and deploy the Cortex Sidecar agent.',
};

export default function DashboardDownloadsPage() {
  // Dashboard layout already enforces authentication.
  return <DownloadClient />;
}

