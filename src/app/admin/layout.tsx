import { AdminLanguageProvider } from '@/components/admin/admin-language-provider';
import { adminMetadata, readAdminLanguagePreferences } from '@/lib/admin-i18n/server';
import { WorkspaceWorkerRegistration } from '@/components/workspace-app/worker-registration';
import '../../styles/admin.css';
import '../../styles/security-center.css';
import '../../styles/blog-admin.css';
import '../../styles/canvas-editor.css';
import '../../styles/admin-refinements.css';
import "../../styles/cms-collections.css";
import '../../styles/guided-tour.css';
import '../../styles/planner-board.css';
import '../../styles/social-workflow.css';
import '../../styles/cms-saas.css';
import '../../styles/team.css';
import '../../styles/hospitality-admin.css';
export function generateMetadata() {
  return adminMetadata('/admin').then(meta => ({ ...meta, manifest: '/admin/manifest.webmanifest',
    appleWebApp: { capable: true, title: 'CMS', statusBarStyle: 'default' as const },
    icons: { icon: '/workspace-branding/favicon-32.png', apple: '/workspace-branding/cms-180.png' },
  }));
}
export const dynamic='force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { workspaceLanguage, preferredLanguage } = await readAdminLanguagePreferences();
  return <AdminLanguageProvider initialWorkspaceLanguage={workspaceLanguage} initialPreferredLanguage={preferredLanguage}><WorkspaceWorkerRegistration scope="cms" />{children}</AdminLanguageProvider>;
}
