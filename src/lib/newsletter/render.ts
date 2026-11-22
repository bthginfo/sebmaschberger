import {defaultDesign,newsletterLink,type Brand,type CampaignDraft,type Design} from './model';

export const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,letter=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[letter]!);
const lines=(text:string)=>escapeHtml(text).replace(/\r?\n/g,'<br>');
function buttonText(hex:string){
 const [r,g,b]=[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16)/255)
  .map(channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4);
 return .2126*r+.7152*g+.0722*b>.18?'#111111':'#ffffff';
}

function shell(brand:Brand,design:Design,title:string,preview:string,body:string,unsubscribe?:string){
 const font=design.font==='editorial'?'Georgia, serif':'Arial, Helvetica, sans-serif';
 const legal=[brand.legalName,brand.address,brand.email].filter(Boolean).join('\n');
 return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(title)+'</title></head>'+
  '<body style="margin:0;background:'+design.background+';color:'+design.ink+';font:16px/1.6 '+font+'">'+
  (preview?'<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">'+escapeHtml(preview)+'</div>':'')+
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">'+
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:'+design.paper+';border-radius:'+(design.radius==='soft'?20:0)+'px">'+
  '<tr><td style="padding:22px 24px 16px;border-bottom:2px solid '+design.accent+';font-weight:bold">'+escapeHtml(brand.name)+'</td></tr>'+
  '<tr><td style="padding:12px 24px 18px">'+body+'</td></tr>'+
  '<tr><td style="padding:16px 24px;border-top:1px solid #afafaf;font-size:13px;line-height:1.6">'+lines(legal)+
  (unsubscribe?'<p><a style="color:inherit;text-decoration:underline" href="'+escapeHtml(unsubscribe)+'">Newsletter abmelden</a></p>':'')+
  '</td></tr></table></td></tr></table></body></html>';
}
function button(label:string,href:string,design:Design){
 return '<p style="margin:20px 0"><a style="display:inline-block;padding:10px 16px;background:'+design.accent+';color:'+buttonText(design.accent)+';text-decoration:none;font-weight:bold;border-radius:'+(design.radius==='soft'?8:0)+'px" href="'+escapeHtml(href)+'">'+escapeHtml(label)+'</a></p>';
}

export function renderCampaign(campaign:CampaignDraft,brand:Brand,unsubscribe:string){
 const {design}=campaign,parts:string[]=[],plain:string[]=[];
 for(const block of campaign.blocks){
  if(block.type==='text'){
   if(block.heading.trim()){parts.push('<h2 style="font-size:25px;line-height:1.22;font-weight:700;margin:22px 0 8px">'+escapeHtml(block.heading)+'</h2>');plain.push(block.heading);}
   if(block.body.trim()){parts.push('<p style="margin:12px 0">'+lines(block.body)+'</p>');plain.push(block.body);}
  }else if(block.type==='image'){
   const image=newsletterLink(block.src,brand.origin,true);
   if(image&&block.alt.trim()){parts.push('<p style="margin:18px 0"><img style="width:100%;height:auto;display:block" src="'+escapeHtml(image.href)+'" alt="'+escapeHtml(block.alt)+'"></p>');plain.push(block.alt);}
  }else if(block.type==='button'){
   const link=newsletterLink(block.href,brand.origin);
   if(!link||!block.label.trim())continue;
   if(campaign.tagLinks&&link.origin===new URL(brand.origin).origin){
    link.searchParams.set('utm_source','newsletter');link.searchParams.set('utm_medium','email');
    link.searchParams.set('utm_campaign','newsletter-'+campaign.id.slice(0,8));
   }
   parts.push(button(block.label,link.href,design));plain.push(block.label+' · '+link.href);
  }else parts.push('<hr style="border:0;border-top:1px solid #afafaf;margin:20px 0">');
 }
 return {subject:campaign.subject,
  html:shell(brand,design,campaign.subject,campaign.preview,parts.join(''),unsubscribe),
  text:[campaign.subject,campaign.preview,...plain,brand.legalName,brand.address,brand.email,'Newsletter abmelden · '+unsubscribe].filter(Boolean).join('\n\n')};
}

export function renderConfirmation(brand:Brand,link:string){
 const subject='Newsletter-Anmeldung bestätigen';
 const intro='Für diese E-Mail-Adresse wurde ein Newsletter bei '+brand.name+' angefragt.';
 const hint='Wenn Sie die Anmeldung nicht selbst angefragt haben, können Sie diese E-Mail ignorieren. Der Link ist 48 Stunden gültig.';
 const body='<h1 style="font-size:25px">'+subject+'</h1><p>'+escapeHtml(intro)+'</p>'+button('Zur Bestätigung',link,defaultDesign)+'<p>'+hint+'</p>';
 return {subject,text:[intro,link,hint,brand.legalName,brand.email].join('\n\n'),html:shell(brand,defaultDesign,subject,'',body)};
}

const tokenPages={
 confirm:{label:'Newsletter abonnieren',description:'Bestätigen Sie Ihre Anmeldung, um den Newsletter zu erhalten.',success:'Ihre Newsletter-Anmeldung ist bestätigt.'},
 unsubscribe:{label:'Newsletter abmelden',description:'Hier können Sie Ihre Einwilligung zum Newsletter widerrufen.',success:'Sie sind vom Newsletter abgemeldet.'},
};
export function newsletterActionPage(action:'confirm'|'unsubscribe',token:string,result?:boolean){
 const content=tokenPages[action];
 const body=result===undefined?'<p>'+content.description+'</p><form method="post"><input type="hidden" name="token" value="'+escapeHtml(token)+'"><button>'+content.label+'</button></form>':
  '<p role="status">'+(result?content.success:'Dieser Link ist ungültig oder abgelaufen. Wenden Sie sich an die Kontaktadresse im Impressum.')+'</p>';
 return new Response('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+content.label+'</title><main><h1>'+content.label+'</h1>'+body+'<p><a href="/">Zur Website</a></p></main><style>body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#f2efe8;color:#192938}main{max-width:38rem;margin:10vh auto;padding:24px}button{font:inherit;font-weight:700;min-height:44px;border:0;border-radius:6px;padding:8px 16px;color:white;background:#183247;cursor:pointer}a{color:inherit}</style></html>',{
  status:result===false?400:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"},
 });
}
