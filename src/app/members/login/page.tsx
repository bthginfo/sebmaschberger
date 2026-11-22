import { redirect } from 'next/navigation';
import { MemberAuth } from '@/components/club/member/member-auth';
import { clubSession } from '@/lib/club/auth';
import { requireClubPage } from '@/lib/club/enabled';

export default async function Page() {
  const { brandName } = await requireClubPage();
  if (await clubSession()) redirect('/members');
  return <MemberAuth mode="login" brandName={brandName} />;
}
