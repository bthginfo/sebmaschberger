import { redirect } from 'next/navigation';
import { MemberPortal } from '@/components/club/member/member-portal';
import { clubSession } from '@/lib/club/auth';
import { clubWorkspace } from '@/lib/club/workspace';
import { requireClubPage } from '@/lib/club/enabled';

export default async function Page() {
  const feature = await requireClubPage();
  const actor = await clubSession();
  if (!actor) redirect('/members/login');
  return <MemberPortal initial={await clubWorkspace(actor, 'member', feature)} />;
}
