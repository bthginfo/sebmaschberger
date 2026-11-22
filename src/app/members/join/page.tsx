import { MemberAuth } from '@/components/club/member/member-auth';
import { requireClubPage } from '@/lib/club/enabled';

export default async function Page() {
  const { brandName } = await requireClubPage();
  return <MemberAuth mode="join" brandName={brandName} />;
}
