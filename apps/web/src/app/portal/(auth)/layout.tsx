/**
 * Authentication Layout (No Navigation)
 *
 * Minimal layout for authentication pages without navigation bars
 * This layout prevents the parent portal layout from rendering navigation
 */

export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render children in a clean container without portal navigation
  // This overrides the parent layout's navigation rendering
  return (
    <div className="auth-layout">
      {children}
    </div>
  );
}
