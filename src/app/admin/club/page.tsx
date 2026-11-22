import { ClubAdmin } from '@/components/club/admin/club-admin';
import { adminMetadata } from '@/lib/admin-i18n/server';
import { ownerClubActor } from '@/lib/club/auth';
import { clubWorkspace } from '@/lib/club/workspace';
import { requireOwnerPage } from '@/lib/team/owner-page';
import { requireClubPage } from '@/lib/club/enabled';

export function generateMetadata() {
  return adminMetadata('/admin/club');
}
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; play?: string }> }) {
  const feature = await requireClubPage();
  await requireOwnerPage();
  const query = await searchParams;
  return <ClubAdmin initial={await clubWorkspace(ownerClubActor(), 'manage', feature)} initialView={typeof query.view === 'string' ? query.view : undefined} initialPlayId={typeof query.play === 'string' ? query.play : undefined} />;
}
