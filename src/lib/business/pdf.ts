import {PDFDocument,rgb,type PDFFont} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {documentDesignSchema,type DocumentDesign,logoBytes} from './design';
import {documentTotals,type MoneyLine} from './money';

export interface BusinessDocument {
 kind:'offer'|'invoice'|'receipt'|'cancellation';number:string;title:string;issuedAt:string;preview?:boolean;language?:'de'|'en';
 supplier:{name:string;address:string;email:string;phone?:string;taxId?:string;iban?:string};buyer:{name:string;address:string};
 items:MoneyLine[];priceMode?:'net'|'gross';dueDate?:string;serviceDate?:string;validUntil?:string;
 notes?:string[];credits?:{label:string;amountCents:number}[];taxExemptNote?:string;
}
const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
export async function renderBusinessPdf(input:BusinessDocument,design:DocumentDesign,fonts:{regular:Uint8Array;bold:Uint8Array}){
 const english=input.language==='en',locale=english?'en-GB':'de-DE';
 const t=(de:string,en:string)=>english?en:de;
 const euro=(c:number)=>new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(c/100);
 const d=documentDesignSchema.parse(design);if(!input.items.length||input.items.length>60||input.items.some(x=>x.description.length>2000))throw new Error('Bitte ein bis 60 Positionen mit höchstens 2.000 Zeichen verwenden.');
 const totals=documentTotals(input.items,input.priceMode),pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const regular=await pdf.embedFont(fonts.regular,{subset:true}),bold=await pdf.embedFont(fonts.bold,{subset:true});
 const charset=new Set(regular.getCharacterSet()),clean=(text:string)=>Array.from(String(text).normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'')).filter(c=>c==='\n'||charset.has(c.codePointAt(0)!)).join('');
 const words=(text:string,width:number,size:number,font:PDFFont=regular)=>{
  const result:string[]=[];for(const paragraph of clean(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;const chunks:string[]=[];let chunk='';for(const char of Array.from(word)){if(font.widthOfTextAtSize(chunk+char,size)>width){if(chunk)chunks.push(chunk);chunk=char;}else chunk+=char;}if(chunk)chunks.push(chunk);for(const part of chunks){const candidate=line?line+' '+part:part;if(font.widthOfTextAtSize(candidate,size)>width&&line){result.push(line);line=part;}else line=candidate;}}result.push(line);}return result;
 };
 const margin=44,width=595.28-2*margin,size=d.layout==='compact'?9:10,leading=size+4;
 let page=pdf.addPage([595.28,841.89]),y=0;
 const logo=logoBytes(d),image=logo?await pdf.embedPng(logo):null;
 const label=({offer:t('Angebot','Quote'),invoice:t('Rechnung','Invoice'),receipt:t('Bestellbeleg','Receipt'),cancellation:t('Stornorechnung','Credit note')} as const)[input.kind];
 pdf.setTitle(input.number+' · '+input.title);pdf.setAuthor(input.supplier.name);const issued=new Date(input.issuedAt);if(!Number.isFinite(issued.getTime()))throw new Error('Ungültiges Belegdatum.');pdf.setCreationDate(issued);pdf.setModificationDate(issued);
 function text(value:string,x:number,at:number,fontSize=size,heavy=false,ink=d.ink){page.drawText(clean(value),{x,y:at,size:fontSize,font:heavy?bold:regular,color:color(ink)});}
 function header(first=false){page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:color(d.paper)});page.drawRectangle({x:margin,y:800,width,height:d.layout==='classic'?2:4,color:color(d.accent)});if(image){const dims=image.scaleToFit(d.logoWidth,45);page.drawImage(image,{x:d.logoAlign==='right'?595.28-margin-dims.width:margin,y:735+(45-dims.height)/2,width:dims.width,height:dims.height});}else {const nameLines=words(d.brandName,width,18,bold);for(const [i,line] of nameLines.entries())text(line,margin,762-i*21,18,true);}const bottom=image?735:762-(words(d.brandName,width,18,bold).length-1)*21;const start=Math.min(710,bottom-35);if(!first){text(label+' · '+input.number,margin,start,11,true);y=start-30;}else y=start;}
 function next(){if(pdf.getPageCount()>=160)throw new Error('Der Beleg ist zu umfangreich. Bitte kürzen Sie die Positionen.');page=pdf.addPage([595.28,841.89]);header();}
 function ensure(height:number){if(y-height<118)next();}
 function paragraph(value:string,x=margin,w=width,fontSize=size,heavy=false){for(const line of words(value,w,fontSize,heavy?bold:regular)){ensure(fontSize+5);text(line,x,y,fontSize,heavy);y-=fontSize+5;}}
 header(true);
 paragraph(input.supplier.name,margin,width,10,true);paragraph(input.supplier.address,margin,width,9);y-=17;
 if(input.preview){text(t('UNVERBINDLICHE VORSCHAU · BEISPIELDATEN','DESIGN PREVIEW · SAMPLE DATA'),margin,y,8,true,d.accent);y-=20;}
 paragraph(input.buyer.name,margin,width,11,true);paragraph(input.buyer.address);y-=22;
 paragraph(label,margin,width,d.layout==='classic'?24:28,true);paragraph(input.number,margin,width,10,true);
 paragraph(t('Datum: ','Date: ')+issued.toLocaleDateString(locale,{timeZone:'Europe/Berlin'}),margin,width,9);paragraph(input.title,margin,width,13,true);
 if(input.serviceDate)paragraph(t('Leistungsdatum: ','Service date: ')+input.serviceDate,margin,width,9);y-=12;
 function columns(){ensure(36);page.drawRectangle({x:margin,y:y-7,width,height:25,color:color('#f1e6d8')});text(t('Beschreibung','Description'),margin+7,y,9,true);text(t('Menge','Quantity'),320,y,9,true);text(input.priceMode==='gross'?t('Stück brutto','Gross each'):t('Stück netto','Net each'),372,y,8,true);text(input.priceMode==='gross'?t('Brutto','Gross'):t('Netto','Net'),484,y,9,true);y-=30;}
 columns();const sign=input.kind==='cancellation'?-1:1;
 for(const [index,item] of totals.lines.entries()){
  const description=words((index+1)+'. '+item.description,260,size);if(y<155){next();columns();}
  text(item.quantity.toLocaleString(locale),320,y,9);text(euro(item.unitPriceCents),372,y,9);const amount=euro(sign*(input.priceMode==='gross'?item.grossCents:item.netCents));text(amount,595.28-margin-bold.widthOfTextAtSize(clean(amount),9),y,9,true);
  for(const line of description){if(y<132){next();columns();}text(line,margin+7,y);y-=leading;}
  text(item.taxRate.toLocaleString(locale)+t(' % USt.','% VAT'),margin+7,y,8);y-=24;
 }
 ensure(90);y-=4;page.drawLine({start:{x:margin,y},end:{x:595.28-margin,y},thickness:1,color:color('#dfcdbb')});y-=25;
 function sum(label:string,amount:number,heavy=false){const fontSize=heavy?12:10,rows=words(label,210,fontSize,heavy?bold:regular);ensure(Math.max(25,rows.length*(fontSize+4)));const at=y;for(const [i,line] of rows.entries())text(line,margin+100,at-i*(fontSize+4),fontSize,heavy);const rendered=euro(sign*amount);text(rendered,595.28-margin-(heavy?bold:regular).widthOfTextAtSize(clean(rendered),fontSize),at,fontSize,heavy);y-=Math.max(heavy?26:19,rows.length*(fontSize+4)+5);}
 sum(t('Netto','Net'),totals.netCents);for(const group of totals.groups)sum(group.rate.toLocaleString(locale)+t(' % Umsatzsteuer','% VAT'),group.taxCents);sum(t('Gesamt','Total'),totals.totalCents,true);
 for(const credit of input.credits||[])sum(credit.label,credit.amountCents);if(input.credits?.length)sum(t('Verbleibender Betrag','Remaining total'),totals.totalCents-input.credits.reduce((s,c)=>s+c.amountCents,0),true);
 y-=12;for(const note of [input.taxExemptNote,...(input.notes||[]),input.validUntil?t('Gültig bis: ','Valid until: ')+input.validUntil:'',input.dueDate?t('Zahlbar bis: ','Due date: ')+input.dueDate:'',input.supplier.iban?'IBAN: '+input.supplier.iban:'',d.paymentNote].filter(Boolean))paragraph(note!,margin,width,9);
 const foot=[d.footer,input.supplier.name,[input.supplier.email,input.supplier.phone,input.supplier.taxId].filter(Boolean).join(' · ')].filter(Boolean).join('\n');const footLines=words(foot,width,8);
 if(footLines.length>9)throw new Error('Die Fußzeile ist zu lang. Bitte kürzen Sie die Angaben.');
 for(const [i,p] of pdf.getPages().entries()){const prior=page;page=p;let at=94;for(const line of footLines){text(line,margin,at,8);at-=9;}text(input.number+' · '+(i+1)+' / '+pdf.getPageCount(),margin,22,8);if(input.preview)text(t('Vorschau · nicht versenden','Preview · sample document'),388,22,8);page=prior;}
 return new Uint8Array(await pdf.save());
}
