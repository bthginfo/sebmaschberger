import '@/lib/workspace/modules.css';
import { readAdminLanguage } from '@/lib/admin-i18n/server';
import { REQUEST_LANGUAGE_HEADER } from '@/lib/admin-i18n/locale';
import { headers } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { colorModeBootstrap, themeColors } from '@/lib/site-color-mode';
import { projectBrand } from '@/lib/project-brand';
import {bodyFont,bodyExtendedFont,creatorDisplayFont} from './fonts';
export const metadata: Metadata = { title: { default: 'Website Starter', template: '%s' }, description: 'Individuelle Website mit eigener Inhaltsverwaltung.', icons: { icon: '/workspace-branding/favicon-32.png' }, referrer: 'strict-origin-when-cross-origin' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: themeColors.dark };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestLanguage = (await headers()).get(REQUEST_LANGUAGE_HEADER);
  const language = requestLanguage === 'admin' ? await readAdminLanguage() : requestLanguage === 'en' ? 'en' : 'de';
  const isPublic = requestLanguage !== 'admin';
  return <html lang={language} suppressHydrationWarning={isPublic} data-seb-site={isPublic ? projectBrand : undefined} data-seb-mode={isPublic ? 'dark' : undefined} className={`${bodyFont.variable} ${bodyExtendedFont.variable} ${creatorDisplayFont.variable}`}><body>{isPublic && <script id="site-color-mode" dangerouslySetInnerHTML={{ __html: colorModeBootstrap }} />}{children}</body></html>;
}
