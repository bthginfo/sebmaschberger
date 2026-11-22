import { notFound, redirect } from 'next/navigation';
import { CoachLibrary } from '@/components/coach/coach-library';
import { listClubCoachEntries } from '@/lib/coach/store';
import { clubSession } from '@/lib/club/auth';
import { clubCoach } from '@/lib/club/data';
import { managesClubPlay } from '@/lib/club/play-access';
import { requireClubPage } from '@/lib/club/enabled';

export default async function Page() {
  await requireClubPage(true);
  const actor = await clubSession();
  if (!actor) redirect('/members/login');
  if (!clubCoach(actor)) notFound();
  const initial = (await listClubCoachEntries()).flatMap(entry => managesClubPlay(actor, entry.ownerId) ? [entry.record] : []);
  return <CoachLibrary initial={initial} club />;
}
