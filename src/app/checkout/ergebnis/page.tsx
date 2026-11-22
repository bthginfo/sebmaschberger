import type {Metadata} from 'next';
import {publicOrder} from '@/lib/commerce/service';
import {publishedContent} from '@/lib/content';
import {WITHDRAWAL_PATH} from '@/lib/commerce/withdrawal';
import {CommerceReceipt} from '@/components/creator/commerce-receipt';
import styles from '@/components/creator/commerce.module.css';
export const metadata:Metadata={title:'Bestellstatus',robots:{index:false,follow:false},referrer:'no-referrer'};
export const dynamic='force-dynamic';
export default async function Receipt({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;const id=typeof params.order==='string'?params.order.slice(0,100):'',key=typeof params.key==='string'?params.key.slice(0,100):'';
  try{
    const [initial,consumerSales]=await Promise.all([
      publicOrder(id,key),publishedContent().then(content=>content.config.modules?.commerce?.consumerSales).catch(()=>false)
    ]);
    return <CommerceReceipt initial={initial} accessKey={key} canceled={params.canceled==='1'} withdrawalHref={consumerSales?WITHDRAWAL_PATH:undefined}/>;
  }
  catch{return <main className={styles.receiptPage} id="hauptinhalt"><div className={styles.receiptContent}><h1>Bestellung gerade nicht verfügbar.</h1><p>Bitte öffne den vollständigen persönlichen Bestelllink. Wenn du ihn bereits verwendest, versuche es in einem Moment erneut oder wende dich mit deiner Bestellnummer an den Shop.</p><a href="/">Zur Website</a></div></main>;}
}
