import { auth } from '@/lib/auth/auth';
import { DownloadClient } from '@/components/download/DownloadClient';
import { DownloadGated } from '@/components/download/DownloadGated';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Download - Holi Labs',
    description: 'Download the sidecar agent for Holi Labs clinical co-pilot.',
};

export default async function DownloadPage() {
    const session = await auth();

    return (
        <div className="min-h-screen font-sans tracking-tight text-foreground transition-colors duration-300 overflow-x-hidden bg-background">
            <LandingHeader />

            {!session ? (
                <div className="pt-24 pb-16">
                    <DownloadGated />
                </div>
            ) : (
                <DownloadClient user={session.user} />
            )}

            <Footer />
        </div>
    );
}
