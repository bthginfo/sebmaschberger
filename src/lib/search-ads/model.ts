import { z } from 'zod';

const headline = z.string().trim().min(1).max(30, 'Eine Überschrift darf höchstens 30 Zeichen lang sein.');
const description = z.string().trim().min(1).max(90, 'Ein Anzeigentext darf höchstens 90 Zeichen lang sein.');
const path = z.string().trim().max(15).regex(/^[a-z0-9-]*$/u);
const landing = z.string().url().refine(value => new URL(value).protocol === 'https:');
const keyword = z.object({ term: z.string().trim().min(1).max(100).regex(/^[^\[\]"\r\n]+$/u), match: z.enum(['Phrase','Exact']) }).strict();
const groupId = z.string().regex(/^[a-z0-9-]+$/u);
const group = z.object({
  id: groupId, name: z.string().trim().min(1).max(90), intent: z.string().trim().max(350), landing,
  path1: path, path2: path, headlines: z.array(headline).min(3).max(15), descriptions: z.array(description).min(2).max(4),
  keywords: z.array(keyword).min(1).max(150)
}).strict();
export const campaignSchema = z.object({
  name: z.string().trim().min(3).max(120), locations: z.string().trim().min(2).max(250), language: z.string().trim().min(2).max(70),
  dailyBudget: z.number().min(0).max(100_000), objective: z.string().trim().min(3).max(250),
  bid: z.string().trim().min(3).max(250), setup: z.string().trim().max(3000),
  groups: z.array(group).min(1).max(20), negative: z.array(keyword).max(120),
  launch: z.object({ groupIds: z.array(groupId).min(1).max(20), limit: z.number().int().min(1).max(150) }).strict().optional(),
  sitelinks: z.array(z.object({ title: z.string().trim().min(1).max(25), line1: z.string().trim().max(35), line2: z.string().trim().max(35), landing }).strict()).max(12),
  callouts: z.array(z.string().trim().min(1).max(25)).max(20)
}).strict().superRefine((campaign, context) => {
  const seen = new Set<string>(), seenNames = new Set<string>(), seenIds = new Set<string>();
  campaign.groups.forEach((entry, index) => {
    if(seenNames.has(entry.name.toLowerCase())||seenIds.has(entry.id))context.addIssue({code:'custom',message:'Jede Anzeigengruppe braucht einen eigenen Namen und eine eigene Kennung.',path:['groups',index]});
    seenNames.add(entry.name.toLowerCase());seenIds.add(entry.id);
    if(new Set(entry.headlines.map(value=>value.toLowerCase())).size!==entry.headlines.length ||
      new Set(entry.descriptions.map(value=>value.toLowerCase())).size!==entry.descriptions.length)context.addIssue({code:'custom',message:'Anzeigentexte sollen sich innerhalb der Gruppe unterscheiden.',path:['groups',index]});
    for(const keyword of entry.keywords) {
      const key = keyword.term.toLowerCase().replace(/\s+/gu,' ');
      if (seen.has(key)) context.addIssue({ code: 'custom', message: 'Doppeltes Suchwort: ' + keyword.term, path: ['groups', index, 'keywords'] });
      seen.add(key);
    }
  });
  const launchIds = campaign.launch?.groupIds;
  if (launchIds && (new Set(launchIds).size !== launchIds.length || launchIds.some(id => !seenIds.has(id)))) {
    context.addIssue({code:'custom',message:'Wähle gültige und unterschiedliche Gruppen für die Startauswahl.',path:['launch','groupIds']});
  }
});
export type Campaign = z.infer<typeof campaignSchema>;
export type Match = z.infer<typeof keyword>['match'];
export type CampaignGroup = z.infer<typeof group>;
export type CampaignRecord = { campaign: Campaign; revision: number; status:'draft'|'approved'; approvedAt: string | null };
export function launchPlan(campaign: Campaign): NonNullable<Campaign['launch']> {
  if (campaign.launch) return campaign.launch;
  const preferred = ['online-coaching','personal-training'].filter(id=>campaign.groups.some(group=>group.id===id));
  return { groupIds: preferred.length ? preferred : campaign.groups.slice(0,2).map(group=>group.id), limit: 8 };
}
export function launchSubset(campaign: Campaign): Campaign {
  const start = launchPlan(campaign);
  return {...campaign, groups:campaign.groups.filter(group=>start.groupIds.includes(group.id)).map(group=>({ ...group, keywords:group.keywords.slice(0,start.limit) }))};
}
export const keywordSyntax = (term: string, match: Match) => match === 'Exact' ? '[' + term + ']' : '"' + term + '"';
export function keywordList(entries: CampaignGroup['keywords']) { return entries.map(entry=>keywordSyntax(entry.term,entry.match)).join('\n'); }
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/u.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"','""') + '"';
}
export function csv(rows: string[][]) { return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
export function adsRows(campaign: Campaign) {
  return [
    ['Campaign','Ad Group','Ad Type','Final URL','Path 1','Path 2',
      ...Array.from({length:15},(_,index)=>'Headline '+String(index+1)),...Array.from({length:4},(_,index)=>'Description '+String(index+1)),'Status'],
    ...campaign.groups.map(group=>[campaign.name,group.name,'Responsive Search Ad',group.landing,group.path1,group.path2,
      ...Array.from({length:15},(_,index)=>group.headlines[index]??''),...Array.from({length:4},(_,index)=>group.descriptions[index]??''),'Paused'])
  ];
}
export function keywordRows(campaign: Campaign) {
  return [
    ['Campaign','Ad Group','Keyword','Criterion Type','Status'],
    ...campaign.groups.flatMap(group=>group.keywords.map(keyword=>[campaign.name,group.name,keyword.term,keyword.match,'Enabled'])),
    ...campaign.negative.map(keyword=>[campaign.name,'',keyword.term,'Negative '+keyword.match,'Enabled'])
  ];
}
