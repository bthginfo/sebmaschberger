import { adminMetadata } from '@/lib/admin-i18n/server';
import {redirect} from 'next/navigation';
import {getSession} from '@/lib/auth';
import {AdminLogin} from '@/components/admin/admin-login';
import {publishedContent} from '@/lib/content';
import {staffLogin} from '@/lib/team/model';

export function generateMetadata() {
  return adminMetadata('/admin/login');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ konto?: string | string[] }> }) {
  if (await getSession()) redirect('/admin');
  const siteName = await publishedContent().then(content => content.config.name).catch(() => undefined);
  const login = staffLogin.safeParse((await searchParams).konto);
  return <AdminLogin siteName={siteName} teamLogin={login.success ? login.data : undefined} />;
}
