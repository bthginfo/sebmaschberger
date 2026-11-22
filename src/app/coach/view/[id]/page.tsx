import { notFound } from 'next/navigation';
import { CoachViewer } from '@/components/coach/coach-viewer';
import { requireCoachStudioPage } from '@/lib/coach/enabled';
import { getGuestCoachPlay } from '@/lib/coach/store';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireCoachStudioPage();
  const record = await getGuestCoachPlay((await params).id, false);
  if (!record) notFound();
  return <CoachViewer initial={record} />;
}
