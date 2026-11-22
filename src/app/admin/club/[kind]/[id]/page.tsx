import { ClubRecordPage } from '@/components/club/admin/club-record-page';
import { adminMetadata } from '@/lib/admin-i18n/server';
import { ownerClubActor } from '@/lib/club/auth';
import { requireOwnerPage } from '@/lib/team/owner-page';
import { requireClubPage } from '@/lib/club/enabled';

export function generateMetadata() {
  return adminMetadata('/admin/club');
}

export default async function Page({ params }: { params: Promise<{ kind: string; id: string }> }) {
  await requireClubPage();
  await requireOwnerPage();
  return <ClubRecordPage actor={ownerClubActor()} params={params} />;
}
