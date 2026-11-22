import { CoachAccess } from '@/components/coach/coach-access';
import { requireCoachStudioPage } from '@/lib/coach/enabled';

export default async function Page() {
  await requireCoachStudioPage();
  return <CoachAccess />;
}
