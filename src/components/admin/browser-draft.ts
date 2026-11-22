import type {WebsiteContent} from '@/lib/types';

/** A local recovery copy; deliberately separate from the persisted server backup. */
export function downloadBrowserDraft(content:WebsiteContent){
 const backup={format:'ws-browser-draft-v1',exportedAt:new Date().toISOString(),content};
 const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='website-browser-entwurf.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
