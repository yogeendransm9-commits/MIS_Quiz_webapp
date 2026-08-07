import { redirect } from 'next/navigation';
import { isAuthed } from '@/lib/auth';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) redirect('/admin');
  return <>{children || <DashboardClient />}</>;
}
