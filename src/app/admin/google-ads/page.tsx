import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/team/owner-page';
import { SearchAds } from '@/components/search-ads/search-ads';

export const metadata:Metadata={title:'Google Ads · Kampagnenplanung',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function GoogleAdsPage(){
  await requireOwnerPage();
  return <SearchAds/>;
}
