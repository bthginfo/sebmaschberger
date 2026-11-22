import { notFound, redirect } from 'next/navigation';
import { CoachEditor } from '@/components/coach/coach-editor';
import { CoachViewer } from '@/components/coach/coach-viewer';
import { getClubCoachEntry } from '@/lib/coach/store';
import { clubSession } from '@/lib/club/auth';
import { clubCalendar } from '@/lib/club/data';
import { clubPlayAccess, managesClubPlay } from '@/lib/club/play-access';
import { requireClubPage } from '@/lib/club/enabled';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireClubPage(true);
  const actor = await clubSession();
  if (!actor) redirect('/members/login');
  const { id } = await params;
  const [entry, calendar] = await Promise.all([getClubCoachEntry(id), clubCalendar()]);
  const access = entry && clubPlayAccess(actor, id, entry.ownerId, calendar.assignments);
  if (!entry || !access) notFound();
  if (access === 'view') return <CoachViewer initial={entry.record} memberHref="/members" />;
  const manages = managesClubPlay(actor, entry.ownerId);
  return <CoachEditor initial={entry.record} mode="collaborator" member
    backHref={manages ? '/members/coach' : '/members'}
    assignmentHref={manages ? '/members/manage?view=tactics&play=' + encodeURIComponent(id) : undefined} />;
}
