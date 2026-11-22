import '@/lib/workspace/modules.css';
import { readAdminLanguage } from '@/lib/admin-i18n/server';
import { REQUEST_LANGUAGE_HEADER } from '@/lib/admin-i18n/locale';
import { headers } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import {bodyFont,bodyExtendedFont,creatorDisplayFont} from './fonts';
export const metadata: Metadata = { title: { default: 'Website Starter', template: '%s' }, description: 'Individuelle Website mit eigener Inhaltsverwaltung.', icons: { icon: '/workspace-branding/favicon-32.png' }, referrer: 'strict-origin-when-cross-origin' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#142b27' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestLanguage = (await headers()).get(REQUEST_LANGUAGE_HEADER);
  const language = requestLanguage === 'admin' ? await readAdminLanguage() : requestLanguage === 'en' ? 'en' : 'de';
  return <html lang={language} className={`${bodyFont.variable} ${bodyExtendedFont.variable} ${creatorDisplayFont.variable}`}><body>{children}</body></html>;
}
