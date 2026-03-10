import { redirect } from 'next/navigation';

export default function SignInPage() {
  // Unified authentication entrypoint.
  redirect('/auth/login');
}
