import { notFound, redirect } from 'next/navigation';
import { ClubAdmin } from '@/components/club/admin/club-admin';
import { clubSession } from '@/lib/club/auth';
import { clubManager } from '@/lib/club/data';
import { clubWorkspace } from '@/lib/club/workspace';
import { requireClubPage } from '@/lib/club/enabled';

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; play?: string }> }) {
  const feature = await requireClubPage();
  const actor = await clubSession();
  if (!actor) redirect('/members/login');
  if (!clubManager(actor)) notFound();
  const query = await searchParams;
  return <ClubAdmin initial={await clubWorkspace(actor, 'manage', feature)} initialView={typeof query.view === 'string' ? query.view : undefined} initialPlayId={typeof query.play === 'string' ? query.play : undefined} />;
}
