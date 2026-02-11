import Link from 'next/link';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Footer } from '@/components/landing/Footer';

type PageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default function AccessPage({ searchParams }: PageProps) {
  const callbackUrl = typeof searchParams?.callbackUrl === 'string' && searchParams.callbackUrl.length > 0
    ? searchParams.callbackUrl
    : '/download';

  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const registerHref = `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="min-h-screen font-sans tracking-tight text-foreground transition-colors duration-300 overflow-x-hidden bg-background">
      <LandingHeader />

      <main className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="rounded-[2.5rem] border border-border bg-card p-10 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border shadow-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                Partner Access
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Accept invite & download
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              Create an account or sign in. Once authenticated, you&apos;ll be taken to the download page for macOS and Windows.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={registerHref}
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-xl shadow-primary/15"
              >
                Create account
              </Link>
              <Link
                href={loginHref}
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold text-foreground bg-background border border-border hover:bg-secondary transition-all"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-10 rounded-2xl bg-secondary/40 border border-border p-6">
              <div className="text-sm font-semibold mb-1">Already signed in?</div>
              <p className="text-sm text-muted-foreground mb-4">
                Go straight to downloads.
              </p>
              <Link
                href="/download"
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open download page →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

