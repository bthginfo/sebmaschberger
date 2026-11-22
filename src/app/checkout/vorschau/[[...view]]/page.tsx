import type {Metadata} from 'next';
import {CheckoutPreview} from '@/components/site/checkout-preview';
import type {DemoQuery} from '@/lib/commerce/preview-data';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Bestellvorschau',robots:{index:false,follow:false},referrer:'no-referrer'};

export default async function Preview(props:{params:Promise<{view?:string[]}> ; searchParams:Promise<DemoQuery>}) {
  const [{view},query]=await Promise.all([props.params,props.searchParams]);
  return <CheckoutPreview language="de" route={view??[]} query={query}/>;
}
