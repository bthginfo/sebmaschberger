import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AdminApp, type AdminView } from '@/components/admin/admin-app';
import { canOpenWorkspace, workspaceHome } from '@/lib/team/permissions';

const views = new Set<AdminView>(['editor', 'restaurant-menu', 'reservations', 'templates', 'blog', 'media', 'inquiries', 'settings', 'documents', 'commerce', 'team', 'account']);

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const session = await getSession();
  if (!session?.role) redirect('/admin/login');
  const role = session.role;
  const { view } = await searchParams;
  const requested = typeof view === 'string' && views.has(view as AdminView) && canOpenWorkspace(role,view) ? view as AdminView : workspaceHome(role);
  return <AdminApp initialView={requested} role={role} />;
}
