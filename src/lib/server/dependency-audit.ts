export type LockedDependency = {name:string;version:string};
type Advisory = {id:string;packages:string[];severity?:'low'|'moderate'|'high'|'critical'};
export type DependencyReport = {checkedAt:string;packageVersions:number;findings:Advisory[];partial:boolean};
type OsvResult = {vulns?:{id:string}[];next_page_token?:string};

const publicName=/^(?:@[a-z\d._-]+\/)?[a-z\d._-]+$/i;
const pinnedVersion=/^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/;
const severityValues=['low','moderate','high','critical'] as const;
const api='https://api.osv.dev/v1';
const ttl=6*60*60*1000;
let cached:{expires:number;report:DependencyReport}|undefined;
let inFlight:Promise<DependencyReport>|undefined;

export function cleanDependencies(entries:LockedDependency[]):LockedDependency[]{
 const unique=new Map<string,LockedDependency>();
 for(const entry of entries){
  if(publicName.test(entry.name)&&pinnedVersion.test(entry.version))unique.set(entry.name+'@'+entry.version,entry);
 }
 return [...unique.values()];
}

async function scan(dependencies:LockedDependency[]):Promise<DependencyReport>{
 if(!dependencies.length)throw new Error('Lockfile inventory is empty');
 const signal=AbortSignal.timeout(8000);
 const groups:LockedDependency[][]=[];
 for(let i=0;i<dependencies.length;i+=160)groups.push(dependencies.slice(i,i+160));
 const hits=new Map<string,Set<string>>();
 let partial=false;
 await Promise.all(groups.map(async group=>{
  const response=await fetch(api+'/querybatch',{method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',signal,
   body:JSON.stringify({queries:group.map(({name,version})=>({package:{name,ecosystem:'npm'},version}))})});
  if(!response.ok)throw new Error('Advisory source unavailable');
  const body=await response.json() as {results?:OsvResult[]};
  if(body.results?.length!==group.length)throw new Error('Incomplete advisory response');
  body.results.forEach((result,index)=>{
   if(result.next_page_token)partial=true;
   for(const advisory of result.vulns??[]){
    if(!/^[a-z\d-]{6,90}$/i.test(advisory.id))continue;
    const refs=hits.get(advisory.id)??new Set();
    refs.add(group[index].name+'@'+group[index].version);
    hits.set(advisory.id,refs);
   }
  });
 }));
 const findings=await Promise.all([...hits.entries()].slice(0,40).map(async([id,refs]):Promise<Advisory>=>{
  const finding:Advisory={id,packages:[...refs].sort()};
  try{
   const result=await fetch(api+'/vulns/'+id,{redirect:'error',signal});
   if(result.ok){
    const data=await result.json() as {database_specific?:{severity?:string}};
    const severity=data.database_specific?.severity?.toLowerCase();
    finding.severity=severityValues.find(value=>value===severity);
   }
  }catch{/* Advisory ID and affected lockfile versions are still verified. */}
  return finding;
 }));
 findings.sort((a,b)=>severityValues.indexOf(b.severity??'low')-severityValues.indexOf(a.severity??'low')||a.id.localeCompare(b.id));
 return {checkedAt:new Date().toISOString(),packageVersions:dependencies.length,findings,partial:partial||hits.size>findings.length};
}

export function readDependencyReport(dependencies:LockedDependency[]){
 if(cached&&cached.expires>Date.now())return Promise.resolve(cached.report);
 if(!inFlight)inFlight=scan(dependencies).then(report=>{
  cached={report,expires:Date.now()+ttl};return report;
 }).finally(()=>{inFlight=undefined;});
 return inFlight;
}

export function dependencyWorkflowUrl(fallback?:string){
 const owner=process.env.VERCEL_GIT_REPO_OWNER, repo=process.env.VERCEL_GIT_REPO_SLUG;
 const identifier=/^[a-z\d_.-]+$/i;
 const repository=owner&&repo&&identifier.test(owner)&&identifier.test(repo)?owner+'/'+repo:fallback;
 return repository?'https://github.com/'+repository+'/actions/workflows/security.yml':null;
}
