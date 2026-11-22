import type {AgentTextPatch} from './model';

const textFields=new Set(['heading','text','title','subtitle','description','label','caption','alt','altText','quote','name','role','question','answer','eyebrow','buttonLabel','ctaLabel','summary','body','kicker','intro','overline','headline','tagline']);
const unsafe=new Set(['__proto__','prototype','constructor']);
export type AgentTextTarget={path:(string|number)[];text:string};
export function agentTextTargets(content:unknown,maxChars=64000):AgentTextTarget[]{
 const result:AgentTextTarget[]=[];let total=0;
 function visit(value:unknown,path:(string|number)[],depth:number){if(depth>6||total>=maxChars)return;if(typeof value==='string'){if(typeof path.at(-1)==='string'&&textFields.has(String(path.at(-1)))&&value.length<=8000&&total+value.length<=maxChars){result.push({path,text:value});total+=value.length;}return;}if(Array.isArray(value)){value.slice(0,100).forEach((entry,index)=>visit(entry,[...path,index],depth+1));return;}if(value&&typeof value==='object')for(const[key,entry]of Object.entries(value))if(!unsafe.has(key)&&!/^(?:style|design|settings|code|html|script)$/i.test(key))visit(entry,[...path,key],depth+1);}
 visit(content,[],0);return result;
}
export function patchAgentText<T>(content:T,patch:Pick<AgentTextPatch,'path'|'previousText'|'text'>):T{
 const target=agentTextTargets(content).find(item=>JSON.stringify(item.path)===JSON.stringify(patch.path));
 if(!target||target.text!==patch.previousText)throw Error('Das Textfeld oder sein Inhalt wurde inzwischen geändert. Bitte den Abschnitt neu lesen.');
 const next=structuredClone(content);let cursor:any=next;
 for(const key of patch.path.slice(0,-1)){if(typeof key==='string'&&unsafe.has(key)||!cursor||typeof cursor!=='object'||!Object.hasOwn(cursor,key))throw Error('Dieses Textfeld ist nicht bearbeitbar.');cursor=cursor[key];}
 cursor[patch.path.at(-1)!]=patch.text;return next;
}
