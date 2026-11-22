import { PublishedPage, publishedPageMetadata } from '@/components/site/published-page';
import { SHOP_SEARCH_EN_SLUG } from '@/lib/route-template-keys';

export const dynamic = 'force-dynamic';

export function generateMetadata() {
  return publishedPageMetadata(SHOP_SEARCH_EN_SLUG);
}

export default async function ShopSearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  return <PublishedPage path={SHOP_SEARCH_EN_SLUG} query={typeof q === 'string' ? q : ''} />;
}
