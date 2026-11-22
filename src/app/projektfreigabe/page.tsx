import type { Metadata } from 'next';
import { publishedContent } from '@/lib/content';
import { PROPOSAL_PATH } from '@/lib/proposals/model';
import { PublishedPage, publishedPageMetadata } from '@/components/site/published-page';
import { ProposalDecision } from '@/components/site/proposal-decision';
import { resolvePage } from '@/lib/blog';
import styles from '@/components/creator/withdrawal.module.css';

export const dynamic = 'force-dynamic';
const slug = PROPOSAL_PATH.slice(1);
export async function generateMetadata(): Promise<Metadata> {
  const content=await publishedContent();
  if(resolvePage(content,slug))return publishedPageMetadata(slug);
  return {title:'Projektfreigabe',robots:{index:false,follow:false},referrer:'no-referrer'};
}
export default async function ProposalPage() {
  const content=await publishedContent();
  if(resolvePage(content,slug))return <PublishedPage path={slug}/>;
  return <main id="hauptinhalt" className={styles.page}><div className={styles.content}>
    <a href="/" className={styles.brand}>{content.config.name}</a>
    <h1>Ihr Vorschlag</h1>
    <ProposalDecision/>
    <a href="/datenschutz" className={styles.privacy}>Datenschutz</a>
  </div></main>;
}
