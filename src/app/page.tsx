import { PublishedPage, publishedPageMetadata } from "@/components/site/published-page";
import { publishedContent } from "@/lib/content";
import { websiteHomeSlug } from "@/lib/site-languages";
import { redirect } from "next/navigation";

export const revalidate = false;
export async function generateMetadata() {
  const content = await publishedContent();
  return publishedPageMetadata(websiteHomeSlug(content.config, content.pages));
}
export default async function Home() {
  const content = await publishedContent();
  const home = websiteHomeSlug(content.config, content.pages);
  if (home) redirect("/" + home);
  return <PublishedPage path="" />;
}
