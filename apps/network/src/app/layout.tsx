import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Holi Network — Leakage Prevention Engine',
  description: 'LATAM Referral Network: Stop revenue leakage with WhatsApp-driven patient booking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
