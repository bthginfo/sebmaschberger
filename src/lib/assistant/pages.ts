import {assistantPagePlanSchema,type AssistantPagePlan} from './model';
import {createSection} from '../section-library';
import {allowedAssistantSectionCatalog,assistantSectionSupportsItems} from './catalog';
import type {PageContent,SectionType,WebsiteContent} from '../types';
import {websiteSchema} from '../validation';

/** Only descriptors are sent to the model; private settings and the document stay in the CMS. */
export function assistantSectionCatalog(content:Pick<WebsiteContent,'config'>){
 return allowedAssistantSectionCatalog(content.config);
}

export function assistantPageAddressIssue(content:WebsiteContent,slug:string):string|null {
 if(!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(slug)||/^(?:admin|api|_next|demo|checkout|studio-embed)(?:\/|$)/.test(slug))return 'Diese Seitenadresse ist reserviert oder ungültig. Bitte wählen Sie eine andere.';
 if(content.pages.some(page=>page.slug===slug))return 'Diese Seitenadresse wird bereits verwendet. Bitte ändern Sie die Adresse im Vorschlag.';
 const blog=content.config.blog;
 if(blog?.enabled&&(slug===blog.slug||slug.startsWith(blog.slug+'/')))return 'Diese Adresse gehört zum Blog. Bitte wählen Sie eine andere Seitenadresse.';
 return null;
}

/** Pure local application: one immutable change, no navigation, persistence, provider or publication. */
export function applyAssistantPagePlan(content:WebsiteContent,input:AssistantPagePlan,capturedToken:string|undefined,currentToken:string):{content:WebsiteContent;page:PageContent}{
 if(!capturedToken||capturedToken!==currentToken)throw new Error('Der Entwurf wurde inzwischen geändert. Bitte erstellen Sie einen neuen Seitenvorschlag.');
 if(content.pages.length>=100)throw new Error('Die Website enthält bereits 100 Seiten. Entfernen Sie zuerst einen nicht mehr benötigten Entwurf.');
 const plan=assistantPagePlanSchema.parse(input),addressIssue=assistantPageAddressIssue(content,plan.slug);if(addressIssue)throw new Error(addressIssue);
 const allowed=new Set(assistantSectionCatalog(content).map(section=>section.type));
 if(plan.sections.some(section=>!allowed.has(section.type as SectionType)))throw new Error('Ein vorgeschlagener Abschnitt ist für diese Website nicht verfügbar. Bitte einen neuen Vorschlag erstellen.');
 if(plan.sections.some(section=>section.items?.length&&!assistantSectionSupportsItems(section.type)))throw new Error('Ein Abschnitt unterstützt diese Listeneinträge nicht. Bitte einen passenden Abschnitt verwenden oder die Liste entfernen.');
 const page:PageContent={id:crypto.randomUUID(),title:plan.title,slug:plan.slug,locale:'de',seo:{title:`${plan.title} | ${content.config.name}`.slice(0,500),description:plan.description,noindex:false},sections:plan.sections.map(item=>{
  const section=createSection(item.type as SectionType);
  // Library artwork, example links and sample lists are not facts supplied by the owner.
  return {...section,name:item.heading.slice(0,180),content:{heading:item.heading,text:item.text,items:(item.items??[]).map(entry=>({id:crypto.randomUUID(),title:entry.title,text:entry.text}))}};
 })};
 const next={...content,pages:[...content.pages,page]};websiteSchema.parse(next);
 return{content:next,page};
}
