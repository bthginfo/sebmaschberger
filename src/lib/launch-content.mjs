const sampleBusiness=/Musterstudio|Musterstadt/i;
const placeholder=/platzhalter/i;
const unfinishedLegal=/PLATZHALTER|NICHT VERÖFFENTLICHUNGSFERTIG/i;
const platforms=/social|plattform|creator|demo|instagram|tiktok|youtube|twitch|spotify|discord/i;
const transparentExample=/fiktiv\w*|\bdemo(?:[-\s]|\b)|lokal\w*/i;
const germanMessage = (message, values = {}) => message.replace(/\{(\w+)\}/g, (placeholder, key) =>
  Object.hasOwn(values, key) ? String(values[key]) : placeholder);
function values(value){
  if(Array.isArray(value))return value.flatMap(values);
  if(value&&typeof value==='object')return Object.values(value).flatMap(values);
  return typeof value==='string'?[value]:[];
}
function externalMedia(value){
  if(Array.isArray(value))return value.some(externalMedia);
  if(!value||typeof value!=='object')return false;
  return Object.entries(value).some(([key,entry])=>
    (['src','srcSet','mediaUrl','videoUrl','href','primaryHref','secondaryHref'].includes(key)&&typeof entry==='string'&&/^(?:https?:)?\/\//i.test(entry))||externalMedia(entry));
}
function declaredCreatorExample(value,sectionType,creator){
  if(creator?.enabled!==true||!value||externalMedia(value))return false;
  const text=values(value).join(' ');
  const base=creator.demoBasePath;
  const demoLink=typeof base==='string'&&base.startsWith('/')&&['href','primaryHref','secondaryHref'].some(key=>typeof value[key]==='string'&&(value[key]===base||value[key].startsWith(base+'/')||value[key].startsWith(base+'#')));
  const explicitMock=value.placeholder===true&&(sectionType.startsWith('creator-')||typeof value.platform==='string');
  return explicitMock||(demoLink&&platforms.test(text))||(transparentExample.test(text)&&platforms.test(text));
}
export function publicLaunchAddress(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && url.pathname === '/' && !url.search && !url.hash && url.hostname.includes('.')
      && !/(?:\.invalid|\.test|\.example|\.localhost)$|^(?:\d{1,3}\.){3}\d{1,3}$/i.test(url.hostname)
      && !/(?:^|\.)example\.(?:com|net|org)$/i.test(url.hostname);
  } catch {
    return false;
  }
}
/** Formal checks on public content. Provider ownership and legal sufficiency are separate. */
export function preflightContentIssues(content, t = germanMessage){
  const issues=[];
  const config=content.config||{};
  const email=String(config.email||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||/(?:\.(?:invalid|test|example)|@(?:[^@.]+\.)?example\.(?:com|net|org))$/i.test(email)||placeholder.test(email))issues.push(t('Kontaktadresse fehlt oder ist ein Platzhalter.'));
  const pages=(content.pages||[]).map(page=>({...page,sections:(page.sections||[]).filter(section=>section.visible!==false)}));
  const posts=config.blog?.enabled?(content.posts||[]).filter(post=>post.status==='published'):[];
  const templates=Object.entries(content.templates||{}).filter(([key])=>key.startsWith('blog-')?config.blog?.enabled:config.modules?.commerce?.enabled);
  const published=[...pages,...posts,...templates.map(([key,layout])=>({title:key,sections:layout.sections,seo:layout.seo}))];
  if(sampleBusiness.test(JSON.stringify({config,published})))issues.push(t('Die öffentlichen Inhalte enthalten noch Musterangaben.'));
  if(!String(config.legalName||'').trim())issues.push(t('Der Name des Anbieters fehlt.'));
  if(config.modules?.commerce?.enabled&&config.modules.commerce.consumerSales===undefined){
    issues.push(t('Klären Sie die Zielgruppe des Shops und richten Sie für Verkäufe an Verbraucher die Widerrufsfunktion ein.'));
  }
  for(const [slug,title] of [['impressum','Impressum'],['datenschutz','Datenschutz']]){
    const page=pages.find(candidate=>candidate.slug===slug);
    if(!page?.sections.some(section=>String(section.content?.text||'').trim()))issues.push(t('Eine ausgefüllte Seite für {page} fehlt.', {page:t(title)}));
    if(page&&config.footer?.legalLinks&&!config.footer.legalLinks.some(link=>link.href==='/'+slug)&&!config.navigation?.some(link=>link.href==='/'+slug)) {
      issues.push(t('Die Seite {page} braucht einen öffentlich erreichbaren Link.', {page:t(title)}));
    }
  }
  let unfinished=placeholder.test(JSON.stringify(config));
  const creator=config.modules?.creator;
  for(const page of published){
    const {sections=[],...metadata}=page;
    if(placeholder.test(JSON.stringify(metadata)))unfinished=true;
    const legal=['impressum','datenschutz'].includes(page.slug);
    if(legal&&unfinishedLegal.test(JSON.stringify(page)))issues.push(t('{page}: Rechtstext ist noch ein Platzhalter.', {page:page.title}));
    for(const section of sections.filter(section=>section.visible!==false)){
      const {items=[],...copy}=section.content||{};
      if(placeholder.test(JSON.stringify({...section,content:copy}))&&(legal||!declaredCreatorExample(copy,section.type||'',creator)))unfinished=true;
      for(const item of items)if(placeholder.test(JSON.stringify(item))&&(legal||!declaredCreatorExample(item,section.type||'',creator)))unfinished=true;
    }
  }
  if(unfinished)issues.push(t('Die öffentlichen Inhalte enthalten noch nicht freigegebene Platzhalter.'));
  return issues;
}

export function launchPublicationIssues(content, address, t = germanMessage) {
  const issues = content ? preflightContentIssues(content, t) : [];
  if (process.env.NEXT_PUBLIC_DESIGN_REVIEW !== 'false') issues.push(t('Der Entwurfsmodus ist noch aktiv.'));
  if (!publicLaunchAddress(address)) issues.push(t('Die endgültige HTTPS-Domain fehlt.'));
  return issues;
}
