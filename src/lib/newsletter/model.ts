import {z} from 'zod';

const label=(max:number)=>z.string().trim().min(1).max(max).refine(value=>!(/[\r\n]/.test(value)));
const color=z.string().regex(/^#[0-9a-f]{6}$/i);
const id=z.string().uuid();
export const consentCopy='Ich möchte den Newsletter per E-Mail erhalten. Ich kann mich jederzeit über den Abmeldelink abmelden.';
export const consentVersion='newsletter-de-v1';

export function newsletterLink(value:string,origin:string,imagesOnly=false){
 if(!value||value.length>1500||/[\u0000-\u0020\\]/.test(value))return null;
 if(!/^https?:\/\//i.test(value)&&!/^\/(?!\/)/.test(value))return null;
 try{
  const target=new URL(value,origin),own=new URL(origin);
  if(target.username||target.password||!(target.protocol==='https:'||target.protocol==='http:'&&target.origin===own.origin))return null;
  if(imagesOnly&&target.origin!==own.origin&&!target.hostname.endsWith('.public.blob.vercel-storage.com'))return null;
  return target;
 }catch{return null;}
}
const url=z.string().trim().max(1500).refine(value=>!value||Boolean(newsletterLink(value,'https://preview.invalid')));
export const blockSchema=z.discriminatedUnion('type',[
 z.object({id,type:z.literal('text'),heading:z.string().max(160),body:z.string().max(4200)}),
 z.object({id,type:z.literal('image'),src:url,alt:z.string().max(300)}),
 z.object({id,type:z.literal('button'),label:z.string().max(70),href:url}),
 z.object({id,type:z.literal('rule')}),
]);
export const designSchema=z.object({
 accent:color, background:color, paper:color, ink:color,
 font:z.enum(['modern','editorial']), radius:z.enum(['square','soft']),
});
export const defaultDesign:Design={accent:'#183247',background:'#efede8',paper:'#ffffff',ink:'#182530',font:'modern',radius:'soft'};
export const campaignInput=z.object({
 id,revision:z.number().int().nonnegative(),
 subject:label(150),preview:z.string().max(175).refine(value=>!(/[\r\n]/.test(value))),
 design:designSchema,blocks:z.array(blockSchema).max(24),
 groupIds:z.array(id).max(48),tagLinks:z.boolean(),
}).strict().refine(value=>new Set(value.blocks.map(block=>block.id)).size===value.blocks.length,{message:'Jeder Inhaltsblock braucht eine eigene Kennung.'});
export const settingsInput=z.object({revision:z.number().int().nonnegative(),enabled:z.boolean(),provider:z.string().trim().max(170).refine(value=>!(/[\r\n]/.test(value)))}).strict();
export const groupInput=z.object({id,revision:z.number().int().nonnegative(),name:label(72),public:z.boolean()}).strict();
export const subscribeInput=z.object({
 email:z.string().trim().toLowerCase().email().max(254),consent:z.literal(true),
 source:z.string().max(240).regex(/^\/[A-Za-z0-9/_äöüÄÖÜß.-]*$/),groupId:id.optional(),
 website:z.string().max(180).optional(),
}).strict();
export const tokenSchema=z.string().regex(/^[a-f0-9]{64}$/);
const revision=z.number().int().positive();
export const commandInput=z.discriminatedUnion('action',[
 z.object({action:z.literal('settings'),settings:settingsInput}),
 z.object({action:z.literal('group'),group:groupInput}),
 z.object({action:z.literal('remove-group'),id,revision}),
 z.object({action:z.literal('subscriber-groups'),id,revision,groupIds:z.array(id).max(48)}),
 z.object({action:z.literal('remove-subscriber'),id,revision}),
 z.object({action:z.literal('campaign'),campaign:campaignInput}),
 z.object({action:z.literal('remove-campaign'),id,revision}),
 z.object({action:z.literal('queue'),id,revision,confirmedCount:z.number().int().positive()}),
 z.object({action:z.literal('stop'),id,revision}),
 z.object({action:z.literal('pump')}),
]);

export type Design=z.infer<typeof designSchema>;
export type Block=z.infer<typeof blockSchema>;
export type CampaignDraft=z.infer<typeof campaignInput>;
export type NewsletterCommand=z.infer<typeof commandInput>;
export type Settings=z.infer<typeof settingsInput>&{everEnabled:boolean};
export type Group=z.infer<typeof groupInput>;
export type Subscriber={
 id:string;email:string;revision:number;status:'pending'|'confirmed'|'unsubscribed';groupIds:string[];
 consent?:{id:string;copy:string;version:string;source:string;requestedAt:string;confirmedAt:string};
 pending?:{hash:string;source:string;groupId?:string;requestedAt:string;expiresAt:string};
 unsubscribeKey?:string;unsubscribedAt?:string;
};
export type Delivery={
 subscriberId:string;consentId:string;status:'queued'|'sending'|'sent'|'skipped'|'failed'|'uncertain';
 attempt?:string;at?:string;
};
export type DeliveryCounts=Record<Delivery['status'],number>;
export type Campaign=CampaignDraft&{status:'draft'|'queued'|'finished'|'stopped';updatedAt:string;queuedAt?:string;deliveries:Delivery[];totals?:DeliveryCounts};
export type Metric='requested'|'confirmed'|'sent'|'unsubscribed';
export type Metrics=Record<Metric,number>;
export type State={
 settings:Settings;groups:Group[];subscribers:Subscriber[];campaigns:Campaign[];
 days:Record<string,Metrics>;lease?:{token:string;until:string};
};
export type Brand={name:string;origin:string;legalName:string;address:string;email:string};
export type Mail={to:string;subject:string;text:string;html:string;id:string;unsubscribe?:string};
export type CampaignView=Omit<Campaign,'deliveries'|'totals'>&{counts:DeliveryCounts;audience:number};
export type SubscriberView=Pick<Subscriber,'id'|'email'|'revision'|'status'|'groupIds'|'unsubscribedAt'>&{confirmedAt?:string;source?:string;version?:string};
export type Workspace={settings:Settings;groups:Group[];subscribers:SubscriberView[];campaigns:CampaignView[];brand:Brand;mailReady:boolean};

export const zeroMetrics=():Metrics=>({requested:0,confirmed:0,sent:0,unsubscribed:0});
export function newsletterDisclosure(provider:string){
 return {
  title:'Newsletter',
  paragraphs:[
   'Wenn Sie den Newsletter abonnieren, verwenden wir Ihre E-Mail-Adresse für den Versand und speichern den Zeitpunkt der Anmeldung und Bestätigung, die Einwilligungsversion und die Anmeldeseite. Die Anmeldung wird erst mit der Bestätigung per E-Mail aktiv. Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO.',
   'Für die Zustellung nutzen wir '+provider+'. Die Empfänger können für den Versand nach Interessen oder Themen gruppiert werden. Wir zählen Anmeldungen, Bestätigungen, Versand und Abmeldungen zusammengefasst. In Newsletter-E-Mails verwenden wir keine Öffnungspixel und keine personalisierten Klick-Weiterleitungen. Falls die Ausgabe Bilder enthält, kann Ihr E-Mail-Programm sie von unserem Hosting laden. Dabei erhält der Hostingdienst die technisch notwendigen Verbindungsdaten. Mit Ihrer Zustimmung zur Webstatistik können Besuche über allgemeine Kampagnenparameter dem Newsletter zugeordnet werden.',
   'Sie können Ihre Einwilligung jederzeit über den Abmeldelink in jeder Ausgabe widerrufen. Unbestätigte Anmeldungen laufen nach 48 Stunden ab. Nach einer Abmeldung verwenden wir die Angaben ausschließlich zur Sperrung weiterer Sendungen und, soweit erforderlich, zum Nachweis der Einwilligung. Sie können uns über die oben genannten Kontaktdaten erreichen.',
  ],
 };
}
