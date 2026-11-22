export interface MoneyLine {description:string;quantity:number;unitPriceCents:number;taxRate:number}
const rounded=(n:bigint,d:bigint)=>(n+d/2n)/d;
/** Prices are integer cents, quantities have at most three decimals, rates two. */
export function documentTotals(items:MoneyLine[],mode:'net'|'gross'='net'){
 const groups=new Map<number,{netCents:number;taxCents:number;grossCents:number}>();
 const lines=items.map(item=>{
  if(!Number.isSafeInteger(item.unitPriceCents)||item.unitPriceCents<0||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>1000000||Math.abs(item.quantity*1000-Math.round(item.quantity*1000))>.000001||!Number.isFinite(item.taxRate)||item.taxRate<0||item.taxRate>100||Math.abs(item.taxRate*100-Math.round(item.taxRate*100))>.000001)throw new Error('Ungültiger Preis, Steuersatz oder ungültige Menge.');
  const amount=rounded(BigInt(item.unitPriceCents)*BigInt(Math.round(item.quantity*1000)),1000n);
  if(amount>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Der Betrag ist zu groß.');
  const rate=Math.round(item.taxRate*100),net=mode==='net'?amount:rounded(amount*10000n,10000n+BigInt(rate));
  const tax=mode==='net'?rounded(net*BigInt(rate),10000n):amount-net;
  const group=groups.get(item.taxRate)||{netCents:0,taxCents:0,grossCents:0};group.netCents+=Number(net);group.grossCents+=Number(mode==='gross'?amount:net+tax);groups.set(item.taxRate,group);
  return{...item,netCents:Number(net),taxCents:Number(tax),grossCents:Number(net+tax)};
 });
 let netCents=0,taxCents=0;for(const [rate,group] of groups){if(mode==='net'){group.taxCents=Number(rounded(BigInt(group.netCents)*BigInt(Math.round(rate*100)),10000n));group.grossCents=group.netCents+group.taxCents;}else{group.netCents=Number(rounded(BigInt(group.grossCents)*10000n,10000n+BigInt(Math.round(rate*100))));group.taxCents=group.grossCents-group.netCents;}netCents+=group.netCents;taxCents+=group.taxCents;}
 if(!Number.isSafeInteger(netCents+taxCents))throw new Error('Der Gesamtbetrag ist zu groß.');
 return{netCents,taxCents,totalCents:netCents+taxCents,groups:[...groups].map(([rate,g])=>({rate,...g})),lines};
}
