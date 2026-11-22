import { adminMetadata } from '@/lib/admin-i18n/server';
import { notFound } from 'next/navigation';
import { CoachEditor } from '@/components/coach/coach-editor';
import { requireCoachStudioPage } from '@/lib/coach/enabled';
import { getOwnerCoachPlay } from '@/lib/coach/store';
import { coachAssistantAvailable } from '@/lib/server/assistant/coach';
import { requireOwnerPage } from '@/lib/team/owner-page';
import { clubFeatures } from '@/lib/club/enabled';

export async function generateMetadata() {
  await requireCoachStudioPage();
  return adminMetadata('/admin/coach/edit');
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireCoachStudioPage();
  await requireOwnerPage();
  const record = await getOwnerCoachPlay((await params).id);
  if (!record) notFound();
  return <CoachEditor initial={record} mode="owner" assistantAvailable={await coachAssistantAvailable()}
    assignmentHref={(await clubFeatures()).coachStudio ? "/admin/club?view=tactics&play=" + encodeURIComponent(record.id) : undefined} />;
}
