import type { AdminLanguage, AdminMessageValues } from '../admin-i18n/locale';

export type WorkspaceCopy = { language: AdminLanguage; t: (message: string, values?: AdminMessageValues) => string };
export type WorkspacePanel = { setCopy(copy: WorkspaceCopy): void; dispose(): void };

export function node<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className=''){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
export function button(text:string,run:()=>void,primary=false){const el=node('button',text,primary?'cm-button cm-primary':'cm-button');el.type='button';el.addEventListener('click',run);return el;}
export function field(label:string,input:HTMLElement){const el=node('label','','cm-field');el.append(node('span',label),input);return el;}
export function input(value='',type='text'){const el=node('input');el.type=type;el.value=value;return el;}
export function select(options:Array<[string,string]>,value:string){const el=node('select');for(const[v,label]of options){const o=node('option',label);o.value=v;el.append(o);}el.value=value;return el;}
export function detail(title:string,text:string){const el=node('details','','cm-help');el.append(node('summary',title),node('p',text));return el;}
export function dialog(root:HTMLElement,title:string,closeLabel='Schließen'){const el=node('dialog','','cm-dialog'),body=node('div','','cm-dialog-body'),header=node('div','','cm-row');header.append(node('h2',title),button(closeLabel,()=>el.close()));body.append(header);el.append(body);root.append(el);el.addEventListener('close',()=>el.remove(),{once:true});el.showModal();return{el,body};}
export async function request<T>(url:string,init?:RequestInit):Promise<T>{const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...init,headers:{'Content-Type':'application/json',...init?.headers}});const data=await response.json();if(!response.ok)throw Error(data.error||'Die Daten konnten gerade nicht geladen werden.');return data as T;}
export function status(root:HTMLElement,text:string,error=false){let el=root.querySelector<HTMLElement>(':scope > .cm-notice');if(!el){el=node('p','','cm-notice');root.prepend(el);}el.textContent=text;el.setAttribute('role',error?'alert':'status');el.classList.toggle('cm-error',error);}
export function download(name:string,text:string,type='text/plain'){const url=URL.createObjectURL(new Blob([text],{type})),link=node('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
