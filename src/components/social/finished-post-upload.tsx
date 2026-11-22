"use client";

import {useEffect,useRef,useState} from 'react';
import {FileImage,LoaderCircle,Upload,Video} from 'lucide-react';
import {api,Button,Field,Input,Modal,Notice} from '@/components/admin/admin-ui';
import type {PublicationRecord} from '@/lib/social/publishing/model';
import { useAdminLanguage } from "@/components/admin/admin-language";

export type UploadTarget={id:string;baseRevision:number;title:string};
export function FinishedPostUpload({target,onStored,onClose,onDirtyChange}:{target:UploadTarget;onStored:(entry:PublicationRecord)=>void;onClose:()=>void;onDirtyChange:(dirty:boolean)=>void}){
  const { t } = useAdminLanguage();
 const[file,setFile]=useState<File|null>(null),[title,setTitle]=useState(target.title),[key,setKey]=useState(()=>crypto.randomUUID()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState('');
 const abort=useRef<AbortController|null>(null),replacement=target.baseRevision>0;
 useEffect(()=>{onDirtyChange(Boolean(file||title!==target.title||busy));return()=>onDirtyChange(false);},[file,title,busy,target.title,onDirtyChange]);
 useEffect(()=>{if(!file)return;const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 useEffect(()=>()=>abort.current?.abort(),[]);
 function close(){if(busy)return;if((file||title!==target.title)&&!window.confirm('Diese noch nicht gespeicherte Dateiauswahl verwerfen?'))return;onClose();}
 function choose(next:File|undefined){if(!next||busy)return;setFile(next);setKey(crypto.randomUUID());setError('');if(!title||title===file?.name.replace(/\.[^.]+$/,''))setTitle(next.name.replace(/\.[^.]+$/,'').slice(0,140));if(next.size>4*1024*1024)setError('Diese Datei ist größer als 4 MB. Bitte einen kleineren Export wählen; Videos werden hier nicht automatisch komprimiert.');else if(!['image/jpeg','image/png','video/mp4'].includes(next.type))setError('Bitte JPEG, PNG oder ein H.264-MP4 auswählen. WebM, HEIC und MOV werden hier nicht umgewandelt.');}
 async function save(){
  if(!file||!title.trim()||busy)return;setBusy(true);setError('');const controller=new AbortController();abort.current=controller;
  try{const form=new FormData();for(const[name,value]of Object.entries({id:target.id,baseRevision:String(target.baseRevision),idempotencyKey:key,brandKey:'default',title:title.trim()}))form.set(name,value);form.set('file',file);
   const result=await api<{ok:true;result:PublicationRecord}>('/api/admin/social/planner/upload',{method:'POST',body:form,signal:controller.signal});onStored(result.result);
  }catch(reason){setError(controller.signal.aborted?'Die Anfrage wurde abgebrochen. Datei und Titel bleiben erhalten. Erneut versuchen prüft denselben Upload, ohne einen zweiten Beitrag anzulegen.':reason instanceof Error?reason.message:'Die Datei konnte nicht gespeichert werden. Bitte erneut versuchen.');}finally{abort.current=null;setBusy(false);}
 }
 return <Modal title={replacement?t("Datei ersetzen"):t("Fertigen Beitrag hochladen")} description={replacement?t("Gespeicherte Caption und Termine bleiben erhalten. Die neue Datei braucht anschließend eine neue Freigabe."):t("Eine fertige Bilddatei oder ein kurzes Reel wird als privater Entwurf gespeichert. Es wird nichts gesendet.")} onClose={close} footer={<><Button disabled={busy} onClick={close}>{t("Schließen")}</Button>{busy?<Button onClick={()=>abort.current?.abort()}>{t("Anfrage abbrechen")}</Button>:<Button variant="primary" disabled={!file||!title.trim()||file.size>4*1024*1024||!['image/jpeg','image/png','video/mp4'].includes(file.type)} onClick={()=>void save()}><Upload size={16}/>{replacement?t("Datei prüfen und ersetzen"):t("Prüfen und als Entwurf speichern")}</Button>}</>}>
  <div className="planner-upload-dialog">
   {error&&<Notice tone="error">{error}</Notice>}
   <p>{t("JPEG oder PNG: 4:5, quadratisch bis 1,91:1. Reel: H.264-MP4, 9:16, 3–90 Sekunden.") + " "}<strong>{t("Maximal 4 MB pro Datei.")}</strong>{" " + t("Bilder werden als JPEG vorbereitet, ohne Zuschnitt. Eine fertige Videodatei wird nicht neu komprimiert.")}</p>
   <label className={`planner-file-picker${busy?' planner-file-picker--busy':''}`}><Upload size={24}/><strong>{file?t("Andere Datei wählen"):t("Datei vom Gerät auswählen")}</strong><span>{t("JPEG · PNG · MP4 · bis 4 MB")}</span><input type="file" aria-label={t("Fertigen Beitrag auswählen")} accept="image/jpeg,image/png,video/mp4" disabled={busy} onChange={event=>choose(event.target.files?.[0])}/></label>
   {file&&<div className="planner-selected-file">{file.type==='video/mp4'?<Video size={19}/>:<FileImage size={19}/>}<span><strong>{file.name}</strong><small>{(file.size/1024/1024).toLocaleString('de-DE',{maximumFractionDigits:2})}{" " + t("MB · wird erst nach Serverprüfung übernommen")}</small></span></div>}
   {file&&preview&&(file.type==='image/jpeg'||file.type==='image/png'?<img className="planner-upload-local-preview" src={preview} alt={t("Ausgewählte Datei vor der Prüfung")}/>:file.type==='video/mp4'?<video className="planner-upload-local-preview" src={preview} controls preload="metadata"/>:null)}
   <Field label={t("Titel im Planer")} hint={t("Hilft Ihnen, den Beitrag später wiederzufinden. Der Titel ist kein Instagram-Text.")}><Input maxLength={140} value={title} disabled={busy} onChange={event=>{setTitle(event.target.value);setKey(crypto.randomUUID());}} placeholder={t("Zum Beispiel: Neues Angebot im November")}/></Field>
   {busy&&<p className="planner-upload-progress" role="status"><LoaderCircle size={17} className="cms-spin"/>{t("Datei hochladen, prüfen und geschützt speichern …")}</p>}
  </div>
 </Modal>;
}
