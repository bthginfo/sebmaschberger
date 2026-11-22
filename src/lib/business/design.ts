import {z} from 'zod';

const color=z.string().regex(/^#[0-9a-f]{6}$/i,'Bitte eine Farbe im Format #123456 verwenden.');
const copy=z.string().trim().max(500).refine(value=>value.split('\n').length<=6,'Bitte höchstens sechs Textzeilen verwenden.');
export const documentDesignSchema=z.object({
 brandName:z.string().trim().min(1).max(100),layout:z.enum(['classic','editorial','compact']),font:z.enum(['outfit','manrope']),
 accent:color,ink:color,paper:color,emailBackground:color,
 logoDataUrl:z.string().max(100000).refine(value=>!value||/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value),'Bitte ein geprüftes PNG-Logo verwenden.'),
 logoWidth:z.number().int().min(60).max(200),logoAlign:z.enum(['left','right']),
 footer:copy,paymentNote:copy,buttonRadius:z.number().int().min(0).max(20),
}).strict().superRefine((value,ctx)=>{if(contrast(value.ink,value.paper)<4.5)ctx.addIssue({code:'custom',message:'Text und Papier brauchen einen höheren Kontrast.',path:['ink']});});
export type DocumentDesign=z.infer<typeof documentDesignSchema>;
export const defaultDocumentDesign=(brandName='Ihr Unternehmen',accent='#8b613b'):DocumentDesign=>({brandName,layout:'editorial',font:'outfit',accent:/^#[a-f\d]{6}$/i.test(accent)?accent:/^#[a-f\d]{3}$/i.test(accent)?'#'+accent.slice(1).split('').map(c=>c+c).join(''):'#315f4d',ink:'#2c2118',paper:'#fffaf4',emailBackground:'#ede2d5',logoDataUrl:'',logoWidth:114,logoAlign:'left',footer:'',paymentNote:'Vielen Dank für die gute Zusammenarbeit.',buttonRadius:12});
export function contrast(a:string,b:string){const luminance=(hex:string)=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export const buttonInk=(accent:string)=>contrast(accent,'#ffffff')>=4.5?'#ffffff':'#102333';
export function logoBytes(design:Pick<DocumentDesign,'logoDataUrl'>):Uint8Array|null {
 if(!design.logoDataUrl)return null;
 const encoded=design.logoDataUrl.split(',')[1];let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));}catch{throw new Error('Das Logo ist kein geprüftes PNG.');}
 if(bytes.length>74000||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new Error('Das Logo ist kein geprüftes PNG.');
 return bytes;
}
export function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
/** Only escaped copy, verified PNGs and caller-validated local links enter this frame. */
export function brandedEmail(input:{subject:string;heading:string;body:string;preheader?:string;footer?:string;actionLabel?:string;actionUrl?:string;design:DocumentDesign;logoSrc?:string;language?:'de'|'en'}){
 const d=documentDesignSchema.parse(input.design),e=escapeHtml,p=(text:string)=>e(text).replace(/\n/g,'<br>');
 const logo=input.logoSrc||d.logoDataUrl;
 if(logo&&!/^(?:data:image\/png;base64,[A-Za-z0-9+/]+=*|cid:[a-zA-Z0-9._-]+)$/.test(logo))throw new Error('Nicht erlaubte Logoquelle.');
 if(input.actionUrl){const url=new URL(input.actionUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Ungültiger E-Mail-Link.');}
 return `<!doctype html><html lang="${input.language??'de'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(input.subject)}</title><style>@media(max-width:620px){.outer{padding:14px 8px!important}.pad{padding:26px 20px!important}.title{font-size:27px!important}}</style></head><body style="margin:0;background:${d.emailBackground};font-family:Arial,Helvetica,sans-serif;color:${d.ink}"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${e(input.preheader||input.body.slice(0,150))}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td class="outer" align="center" style="padding:32px 16px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:${d.paper};border-top:4px solid ${d.accent};border-radius:16px;overflow:hidden"><tr><td class="pad" style="padding:32px 38px 22px;text-align:${d.logoAlign}">${logo?`<img src="${e(logo)}" alt="${e(d.brandName)}" width="${d.logoWidth}" style="width:${d.logoWidth}px;max-width:100%;height:auto;display:inline-block;border:0">`:`<strong style="font-size:25px">${e(d.brandName)}</strong>`}</td></tr><tr><td class="pad" style="padding:12px 38px 34px"><h1 class="title" style="font-size:31px;line-height:1.2;margin:0 0 24px;color:${d.ink}">${e(input.heading)}</h1><div style="font-size:16px;line-height:1.75;overflow-wrap:anywhere">${p(input.body)}</div>${input.actionUrl?`<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px"><tr><td bgcolor="${d.accent}" style="border-radius:${d.buttonRadius}px"><a href="${e(input.actionUrl)}" style="display:inline-block;padding:15px 22px;color:${buttonInk(d.accent)};font-weight:bold;text-decoration:none;border-radius:${d.buttonRadius}px">${e(input.actionLabel||'Details ansehen')}</a></td></tr></table>`:''}</td></tr><tr><td class="pad" style="padding:24px 38px;border-top:1px solid #ddcbb8;font-size:12px;line-height:1.7;color:${d.ink}">${p([d.footer,input.footer].filter(Boolean).join('\n\n'))}</td></tr></table></td></tr></table></body></html>`;
}
