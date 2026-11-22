import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { PublishedPage, publishedPageMetadata } from '@/components/site/published-page';
import { publishedContent } from '@/lib/content';
import { WITHDRAWAL_LABEL, WITHDRAWAL_PATH } from '@/lib/commerce/withdrawal';
import { WithdrawalForm } from '@/components/creator/withdrawal-form';
import styles from '@/components/creator/withdrawal.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await publishedContent();
  return config.modules?.commerce?.consumerSales
    ? { title: WITHDRAWAL_LABEL, robots: { index: false, follow: true } }
    : publishedPageMetadata(WITHDRAWAL_PATH.slice(1));
}

export default async function WithdrawalPage() {
  const { config } = await publishedContent();
  if (!config.modules?.commerce?.consumerSales) return <PublishedPage path={WITHDRAWAL_PATH.slice(1)} />;
  return <main id="hauptinhalt" className={styles.page} style={{
    '--withdrawal-bg': config.theme.background
  } as CSSProperties}>
    <div className={styles.content}>
      <a href="/" className={styles.brand}>{config.name}</a>
      <h1>{WITHDRAWAL_LABEL}</h1>
      <p>Geben Sie an, welchen Vertrag oder Teil des Vertrags Sie widerrufen möchten. Anschließend können Sie Ihre Angaben prüfen und den Widerruf bestätigen.</p>
      <WithdrawalForm />
      <a href="/datenschutz" className={styles.privacy}>Datenschutz</a>
    </div>
  </main>;
}
