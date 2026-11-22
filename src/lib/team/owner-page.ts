import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from '../auth';

export async function requireOwnerPage() {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  if (session.role !== 'owner') redirect('/admin');
}
