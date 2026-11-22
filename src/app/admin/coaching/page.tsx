import type { Metadata } from 'next';
import { PortalApp } from '@/components/coaching-portal/app';
import { currentActor } from '@/lib/coaching-portal/access';
import { portalConfigured } from '@/lib/coaching-portal/store';
import { requireOwnerPage } from '@/lib/team/owner-page';

export const metadata: Metadata = { title: 'Coaching-Kunden · Sebastian Maschberger', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function CoachingWorkspace() {
  await requireOwnerPage();
  return <PortalApp actor={await currentActor()} configured={portalConfigured()}/>;
}
