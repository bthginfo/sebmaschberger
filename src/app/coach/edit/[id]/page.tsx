import { notFound } from 'next/navigation';
import { CoachEditor } from '@/components/coach/coach-editor';
import { requireCoachStudioPage } from '@/lib/coach/enabled';
import { getGuestCoachPlay } from '@/lib/coach/store';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireCoachStudioPage();
  const record = await getGuestCoachPlay((await params).id, true);
  if (!record) notFound();
  return <CoachEditor initial={record} mode="collaborator" />;
}
