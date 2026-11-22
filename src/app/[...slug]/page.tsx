import { PublishedPage, publishedPageMetadata } from '@/components/site/published-page';
import { publishedContent } from '@/lib/content';
import { publicPages } from '@/lib/blog';
import { routeTemplateKeyForPath } from '@/lib/route-template-keys';
import { hasBilingualHomepage } from '@/lib/site-languages';

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  const content = await publishedContent();
  const routes = publicPages(content)
    .filter(page => page.slug && !routeTemplateKeyForPath(page.slug)?.startsWith('shop-'))
    .map(page => ({ slug: page.slug.split('/') }));
  if (hasBilingualHomepage(content.pages)) routes.push({ slug: ['de'] });
  return routes;
}

type Props = { params: Promise<{ slug: string[] }> };
export async function generateMetadata({ params }: Props) {
  return publishedPageMetadata((await params).slug.join('/'));
}

export default async function ContentPage({ params }: Props) {
  return <PublishedPage path={(await params).slug.join('/')} />;
}
