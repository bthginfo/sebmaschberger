import type { Metadata } from 'next';
import { PortalApp } from '@/components/coaching-portal/app';
import { currentActor } from '@/lib/coaching-portal/access';
import { portalConfigured } from '@/lib/coaching-portal/store';

export const metadata: Metadata = { title: 'Sebastian Coaching · Kundenportal', robots: { index: false, follow: false }, referrer: 'no-referrer', manifest: '/portal/manifest.webmanifest' };
export const dynamic = 'force-dynamic';
export default async function Portal() {
  return <PortalApp actor={await currentActor()} configured={portalConfigured()}/>;
}
