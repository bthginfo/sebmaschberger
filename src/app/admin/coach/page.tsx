import { adminMetadata } from '@/lib/admin-i18n/server';
import { CoachLibrary } from '@/components/coach/coach-library';
import { requireCoachStudioPage } from '@/lib/coach/enabled';
import { listCoachPlays } from '@/lib/coach/store';
import { coachAssistantAvailable } from '@/lib/server/assistant/coach';
import { requireOwnerPage } from '@/lib/team/owner-page';

export async function generateMetadata() {
  await requireCoachStudioPage();
  return adminMetadata('/admin/coach');
}

export default async function Page() {
  await requireCoachStudioPage();
  await requireOwnerPage();
  const [plays, assistantAvailable] = await Promise.all([listCoachPlays(), coachAssistantAvailable()]);
  return <CoachLibrary initial={plays} assistantAvailable={assistantAvailable} />;
}
