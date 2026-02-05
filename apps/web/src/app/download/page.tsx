import React from 'react';
import { Metadata } from 'next';
import { auth } from '@/lib/auth/auth';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { DownloadClient } from '@/components/download/DownloadClient';
import { DownloadGated } from '@/components/download/DownloadGated';

export const metadata: Metadata = {
    title: 'Download Interceptor - Holi Labs',
    description: 'Download the sidecar agent for Holi Labs clinical co-pilot.',
};

export default async function DownloadPage() {
    const session = await auth();
    const isAuthenticated = !!session?.user;

    return (
        <div className="min-h-screen font-sans tracking-tight text-foreground transition-colors duration-300 overflow-x-hidden bg-background">
            <LandingHeader />

            {isAuthenticated ? (
                <DownloadClient />
            ) : (
                <div className="pt-24 pb-16">
                    <DownloadGated />
                </div>
            )}

            <Footer />
        </div>
    );
}
