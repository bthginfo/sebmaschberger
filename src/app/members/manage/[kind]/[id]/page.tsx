import { notFound, redirect } from 'next/navigation';
import { ClubRecordPage } from '@/components/club/admin/club-record-page';
import { clubSession } from '@/lib/club/auth';
import { clubManager } from '@/lib/club/data';
import { requireClubPage } from '@/lib/club/enabled';

export default async function Page({ params }: { params: Promise<{ kind: string; id: string }> }) {
  await requireClubPage();
  const actor = await clubSession();
  if (!actor) redirect('/members/login');
  if (!clubManager(actor)) notFound();
  return <ClubRecordPage actor={actor} params={params} />;
}
