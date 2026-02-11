import { redirect } from 'next/navigation';

// Dashboard root should land on the Control Plane Command Center.
export default function DashboardPage() {
  redirect('/dashboard/command-center');
}

