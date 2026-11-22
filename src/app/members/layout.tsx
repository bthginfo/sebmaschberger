import type { Metadata } from 'next';
import { AdminLanguageProvider } from '@/components/admin/admin-language-provider';
import { readAdminLanguagePreferences } from '@/lib/admin-i18n/server';
import { WorkspaceWorkerRegistration } from '@/components/workspace-app/worker-registration';
import { requireClubPage } from '@/lib/club/enabled';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await requireClubPage();
  return { title: brandName + ' · Members', robots: { index: false, follow: false },
    manifest: '/members/manifest.webmanifest', appleWebApp: { capable: true, title: 'Members', statusBarStyle: 'default' },
    icons: { icon: '/workspace-branding/favicon-32.png', apple: '/workspace-branding/member-180.png' },
  };
}

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  await requireClubPage();
  const language = await readAdminLanguagePreferences();
  return <AdminLanguageProvider scope="members" initialWorkspaceLanguage={language.workspaceLanguage} initialPreferredLanguage={language.preferredLanguage}><WorkspaceWorkerRegistration scope="member" />{children}</AdminLanguageProvider>;
}
