import {z} from 'zod';
import {connectionHelpSchema} from '../social/connectors/setup-assistant';

const plain=(max:number)=>z.string().trim().max(max).refine(value=>!/<\/?[a-z][^>]*>/i.test(value),'Bitte nur Text ohne HTML verwenden.');
export const assistantKindSchema=z.enum(['rewrite','page','help','social','ideas']);
export const assistantActionSchema=z.enum(['pages','inquiries','shop','social','settings']);
export const assistantContextSchema=z.object({
 brandName:plain(160).min(1),pageTitle:plain(240).optional(),heading:plain(500).optional(),text:plain(8000).optional(),
 addressing:z.enum(['sie','du']).optional(),audience:plain(300).optional(),voice:plain(400).optional(),
 availableSections:z.array(z.object({type:plain(80).min(1),label:plain(120).min(1)}).strict()).max(100).optional(),
 pageList:z.array(z.object({title:plain(240),slug:plain(250)}).strict()).max(100).optional(),
 draftToken:plain(128).optional(),helpTopic:z.enum(['cms','inquiries','shop','social']).optional(),connectionHelp:connectionHelpSchema.optional()
}).strict().superRefine((context,ctx)=>{
 const sourceLength=[context.brandName,context.pageTitle,context.heading,context.text,context.audience,context.voice].reduce((n,value)=>n+(value?.length||0),0);
 if(sourceLength>10000)ctx.addIssue({code:'custom',message:'Der gewählte Inhalt ist zu lang. Bitte einen kürzeren Abschnitt auswählen.'});
});
export const assistantRequestSchema=z.object({kind:assistantKindSchema,prompt:plain(1500).min(1),context:assistantContextSchema}).strict().superRefine((request,ctx)=>{
 if(request.kind==='rewrite'&&!request.context.text?.trim())ctx.addIssue({code:'custom',path:['context','text'],message:'Wählen Sie zuerst einen Abschnitt mit Text aus.'});
});
const common={title:plain(120).min(1),summary:plain(400).min(1)};
export const socialSuggestionSchema=z.object({headline:plain(180).min(1),body:plain(1200).min(1),caption:plain(2200).min(1)}).strict();
export const assistantPagePlanSchema=z.object({
 title:plain(100).min(1),slug:plain(150).min(1).regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/,'Bitte eine Seitenadresse ohne führenden Schrägstrich verwenden.').refine(value=>!/^(?:admin|api|_next|demo|checkout)(?:\/|$)/.test(value),'Diese Seitenadresse ist reserviert.'),
 description:plain(320),sections:z.array(z.object({type:plain(80).min(1),heading:plain(240).min(1),text:plain(4000),items:z.array(z.object({title:plain(180).min(1),text:plain(1200)}).strict()).max(6).optional()}).strict()).min(1).max(8)
}).strict();
export const assistantProposalSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('rewrite'),...common,text:plain(8000).min(1)}).strict(),
 z.object({kind:z.literal('page'),...common,page:assistantPagePlanSchema}).strict(),
 z.object({kind:z.literal('help'),...common,answer:plain(6000).min(1),actions:z.array(z.object({id:assistantActionSchema,label:plain(100).min(1)}).strict()).max(5)}).strict(),
 z.object({kind:z.literal('social'),...common,social:socialSuggestionSchema}).strict(),
 z.object({kind:z.literal('ideas'),...common,ideas:z.array(plain(300).min(1)).min(1).max(6)}).strict()
]);
export const assistantStatusSchema=z.object({configured:z.boolean(),provider:z.enum(['openai','anthropic']).nullable(),model:plain(200).nullable(),guidedHelp:z.boolean().optional()}).strict();
export const assistantResponseSchema=z.object({ok:z.literal(true),result:z.object({mode:z.enum(['connected','guided']),proposal:assistantProposalSchema}).strict()}).strict();
export type AssistantKind=z.infer<typeof assistantKindSchema>;
export type AssistantActionId=z.infer<typeof assistantActionSchema>;
export type AssistantContext=z.infer<typeof assistantContextSchema>;
export type AssistantRequest=z.infer<typeof assistantRequestSchema>;
export type AssistantProposal=z.infer<typeof assistantProposalSchema>;
export type AssistantStatus=z.infer<typeof assistantStatusSchema>;
export type AssistantPagePlan=z.infer<typeof assistantPagePlanSchema>;
export type SocialSuggestion=z.infer<typeof socialSuggestionSchema>;
export type AssistantTarget={id:string;text:string};
export const ASSISTANT_TASKS:readonly {kind:AssistantKind;label:string;prompt:string}[]=[
 {kind:'rewrite',label:'Website-Text',prompt:'Überarbeite den ausgewählten Text klar und verständlich. Behalte die vorhandenen Angaben bei.'},
 {kind:'page',label:'Seite aufbauen',prompt:'Entwirf eine neue Seite zum ausgewählten Thema mit einem passenden Aufbau aus der verfügbaren Abschnittsbibliothek. Erfinde keine Leistungen oder anderen Angaben.'},
 {kind:'help',label:'CMS-Hilfe',prompt:'Erkläre mir den nächsten sinnvollen Schritt im CMS und zeige mir den passenden Bereich.'},
 {kind:'social',label:'Social-Post',prompt:'Bereite aus diesem Inhalt einen konkreten Social-Post mit Bildtext und Caption vor. Behalte Fakten und Ton bei.'},
 {kind:'ideas',label:'Content-Ideen',prompt:'Schlage drei konkrete Inhalte zum ausgewählten Thema vor. Erkläre jeweils kurz, wie wir sie mit eigenen Angaben umsetzen können.'}
];
const businessSource='Wir möchten Ihnen einen Überblick über unsere Leistungen geben. Wir planen, fertigen und montieren Möbel nach Maß. Bei Fragen können Sie gerne Kontakt mit uns aufnehmen.';
const creatorSource='Hier findet ihr Informationen zu meinen Livestreams. Ich spiele live und spreche mit euch im Chat. Schaut euch die nächsten Termine an und seid dabei.';
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
const cut=(text:string,max:number)=>text.length<=max?text:text.slice(0,max-1).trimEnd()+'…';

/** Local prepared examples, never an SDK call or a fallback from a failed live request. */
export function mockAssistantProposal(input:AssistantRequest,tone:'sie'|'du'='sie'):AssistantProposal{
 const request=assistantRequestSchema.parse(input),context=request.context,du=(context.addressing||tone)==='du',brand=context.brandName.replace(/[.]+$/,''),source=clean(context.text||context.heading||''),topic=cut(context.heading||context.pageTitle||brand,100),short=/kürz|kurz|knapp/i.test(request.prompt);
 let edited=source;
 if(source===businessSource)edited=short?'Möbel nach Maß – geplant, gefertigt und montiert. Sprechen Sie mit uns über Ihr Vorhaben.':'Wir planen, fertigen und montieren Ihre Möbel nach Maß. Sprechen Sie mit uns über Ihr Vorhaben.';
 else if(source===creatorSource)edited=short?'Live spielen. Im Chat dabei sein. Such dir den nächsten Termin aus.':'Live spielen und mit euch im Chat sprechen: Schau dir die nächsten Termine an und sei dabei.';
 else if(short){const sentences=source.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)||[source];edited=sentences.slice(0,2).join(' ').trim();}
 if(request.kind==='rewrite')return{kind:'rewrite',title:'Klarer formuliert.',summary:du?'Vorbereitetes Beispiel auf Basis deines ausgewählten Textes. Prüfe den Vorschlag vor dem Übernehmen.':'Vorbereitetes Beispiel auf Basis Ihres ausgewählten Textes. Prüfen Sie den Vorschlag vor dem Übernehmen.',text:edited||source};
 if(request.kind==='page'){
  const available=context.availableSections?.map(section=>section.type)??['hero','richtext','cta'];
  const preferred=['hero',available.includes('richtext')?'richtext':'text','cta'].filter(type=>available.includes(type)),types=preferred.length?preferred:available.slice(0,3);
  if(!types.length)throw new Error('Für dieses Beispiel stehen keine Abschnitte zur Verfügung.');
  const title=cut(topic,100),base=(title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'neue-seite').slice(0,120),used=new Set(context.pageList?.map(page=>page.slug.replace(/^\//,''))??[]);
  let slug=base;for(let n=2;used.has(slug)||/^(?:admin|api|demo|checkout)$/.test(slug);n++)slug=base+'-'+n;
  return{kind:'page',title:'Ein Seitenaufbau zum Prüfen',summary:'Ein vorbereiteter Aufbau aus vorhandenen Abschnitten. Erst die Bestätigung legt eine neue Seite im lokalen Entwurf an.',page:{title,slug,description:cut(edited||topic,300),sections:types.map((type,index)=>({type,heading:index===0?title:index===1?(du?'Was dich erwartet':'Was Sie erwartet'):(du?'Dein nächster Schritt':'Ihr nächster Schritt'),text:index===0?cut(edited||topic,1200):index===1?cut(source||topic,1200):(du?'Ergänze hier den passenden Kontakt oder nächsten Schritt.':'Ergänzen Sie hier den passenden Kontakt oder nächsten Schritt.')}))}};
 }
 if(request.kind==='help'){
  const prompt=request.prompt.toLowerCase(),topic=context.helpTopic||(/instagram|tiktok|social|verbinden/.test(prompt)?'social':/shop|produkt|bestellung/.test(prompt)?'shop':/anfrag|postfach/.test(prompt)?'inquiries':'cms');
  const answer=topic==='social'?'Wählen Sie im Post-Planer „Kanäle verbinden“. Die Anleitung zeigt App-Einrichtung, benötigte Rechte und die eigene Rücksprungadresse. Danach bestätigen Sie das Konto beim Anbieter und wählen das Zielkonto. In diesem Beispiel wird keine echte Verbindung hergestellt.':topic==='shop'?'Im Shop prüfen Sie Produkte, Varianten und Bestand. Preise und Lieferangaben werden vor dem Speichern geprüft. Zahlungen benötigen eine getrennte Anbieter-Einrichtung. In diesem Beispiel wird nichts bestellt oder berechnet.':topic==='inquiries'?'Im Postfach sehen Sie Anfragen, deren Status und interne Notizen. Dieses öffentliche Beispiel hat keinen Zugriff auf echte Kundennachrichten. Öffnen Sie im echten CMS „Anfragen“, um Ihren aktuellen Bestand zu sehen.':'Wählen Sie eine Seite und anschließend einen Abschnitt. Texte können Sie direkt in der Live-Vorschau bearbeiten. „Speichern“ sichert den Entwurf; erst „Veröffentlichen“ ändert die öffentliche Website. Mit „Rückgängig“ nehmen Sie lokale Änderungen zurück.';
  return{kind:'help',title:'Der nächste Schritt im CMS',summary:'Vorbereitetes Hilfebeispiel, ohne Zugriff auf echte Anfragen, Konten oder Bestellungen.',answer,actions:[{id:topic==='cms'?'pages':topic==='inquiries'?'inquiries':topic==='shop'?'shop':'social',label:topic==='cms'?'Seiten bearbeiten':topic==='inquiries'?'Anfragen ansehen':topic==='shop'?'Shop prüfen':'Kanäle einrichten'}]};
 }
 if(request.kind==='social')return{kind:'social',title:'Ein Post aus dem Inhalt',summary:'Vorbereiteter Beispielentwurf mit bearbeitbarem Bildtext und Caption.',social:{headline:cut(context.heading||brand,150),body:cut(edited||source||topic,700),caption:cut(`${brand} · ${topic}\n\n${edited||source||topic}\n\n${du?'Was möchtest du dazu wissen?':'Was möchten Sie dazu wissen?'}`,2100)}};
 const smallTopic=cut(topic,70);
 return{kind:'ideas',title:'Drei konkrete Content-Ideen',summary:'Vorbereitete Anregungen zum ausgewählten Thema, mit eigenen Angaben auszuarbeiten.',ideas:du?[`Zeig einen kurzen Einblick zu „${smallTopic}“: Nimm einen Arbeitsschritt auf und erkläre, was du dabei machst.`,`Frag deine Community nach einer Frage zu „${smallTopic}“ und beantworte sie in einem kurzen Clip.`,`Mach aus dem Website-Text zu „${smallTopic}“ einen Post: eine klare Aussage, ein eigenes Foto und eine Frage an deine Leute.`]:[`Zeigen Sie einen Arbeitsschritt zu „${smallTopic}“ und erklären Sie ihn anhand eines eigenen Beispiels.`,`Beantworten Sie eine häufige Kundenfrage zu „${smallTopic}“ in einem kurzen Beitrag.`,`Machen Sie aus dem vorhandenen Text zu „${smallTopic}“ einen Post mit einem eigenen Foto und einem klaren nächsten Schritt.`]};
}
