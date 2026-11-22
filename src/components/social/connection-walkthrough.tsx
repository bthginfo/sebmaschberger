"use client";
 import {ArrowLeft,ArrowRight,ArrowUpRight,Check,KeyRound,ShieldCheck,CalendarDays} from 'lucide-react';
 import {CONNECTOR_SPECS,type ConnectorProvider} from '@/lib/social/connectors/model';
 import {CONNECTOR_SETUP} from '@/lib/social/connectors/setup-guide';
 import {connectionJourney} from '@/lib/social/connectors/setup-journey';
 import type {ConnectionHelp} from '@/lib/social/connectors/setup-assistant';

import {useState} from 'react';
import { useAdminLanguage } from "@/components/admin/admin-language";
export function ConnectionWalkthrough({platform,step}:{platform:ConnectorProvider;step:ConnectionHelp['step']}){
  const { t } = useAdminLanguage();
 const[chosen,setChosen]=useState<number|null>(null),active=chosen??(step==='app'?0:step==='connected'?4:3),name=CONNECTOR_SPECS[platform].label,steps=connectionJourney(platform),current=steps[active];
 return <details className="connection-walkthrough">
 <summary>{t("Schritt für Schritt · mit Bildern erklärt")}</summary>
 <div className="connection-walkthrough-body">
  <nav className="connection-journey-nav" aria-label={'Einrichtung für '+name}>{steps.map((item,index)=><span key={item.label} className="connection-journey-nav-item"><button type="button" aria-pressed={active===index} onClick={()=>setChosen(index)}><span aria-hidden="true">{index+1}</span>{item.label}</button></span>)}</nav>
  <figure className="connection-journey-figure">
   <div className="connection-journey-art" aria-label={t("Vereinfachte Beispielansicht ohne echte Zugangsdaten")}>
    <span className="connection-example-label">{t("Beispielansicht")}</span>
    <div className="connection-mini connection-mini--wide">
     <div className="connection-mini-top">{active<2?(platform==='instagram'?'Meta':name)+' · Entwicklerportal':active===2?t("Anbieter → Ihr CMS"):active===3?t("Offizielle Anmeldung"):t("Ihr Post-Planer")}</div>
     {active===0?<><KeyRound size={28} aria-hidden="true"/><strong>{platform==='bluesky'?t("App-Passwort erstellen"):t("Neue App")}</strong><div className="connection-mini-fields"><span>Name <i>{t("Mein Post-Planer")}</i></span><span>Website <i>{t("Ihre eigene Domain")}</i></span></div><span className="connection-mini-action">{platform==='bluesky'?t("Eigenen Zugang erstellen"):t("App im Portal anlegen")}</span>
     </>:active===1?<><ShieldCheck size={28} aria-hidden="true"/><strong>{t("Nur die nötigen Rechte")}</strong><span className="connection-mini-choice"><Check size={16} aria-hidden="true"/>{t("Eigenes Konto erkennen")}</span><span className="connection-mini-choice"><Check size={16} aria-hidden="true"/>{t("Beiträge") + " "}{platform==='tiktok'?t("übergeben"):t("veröffentlichen")}</span><span className="connection-mini-review">{t("Freigabe wird beim Anbieter geprüft")}</span>
     </>:active===2?<><div className="connection-mini-fields"><span>{platform==='bluesky'?'Handle':t("Rücksprungadresse")}<i>{platform==='bluesky'?'ihr-name.bsky.social':t("Exakt aus dem CMS kopieren")}</i></span><span>{platform==='bluesky'?t("App-Passwort"):CONNECTOR_SETUP[platform].clientIdLabel}<i>{platform==='bluesky'?'••••••••':'123…'}</i></span>{platform!=='bluesky'&&<><span>Secret <i>••••••••</i></span></>}{platform==='instagram'&&<><span>{t("Konfigurations-ID") + " "}<i>456…</i></span></>}</div><span className="connection-mini-action">{t("Im geschützten Formular speichern")}</span>
     </>:active===3?<><ShieldCheck size={28} aria-hidden="true"/><strong>{t("Ihr Konto. Ihre Freigabe.")}</strong>{platform==='instagram'&&<><span className="connection-mini-choice">{t("Business-Portfolio · Ihr Unternehmen")}</span></>}<span className="connection-mini-choice"><Check size={16} aria-hidden="true"/>{t("Ihr Profil auswählen")}</span><span className="connection-mini-action">{t("Im CMS verbinden und prüfen")}</span>
     </>:<><CalendarDays size={28} aria-hidden="true"/><strong>{t("Ein Inhalt. Ein Termin.")}</strong><div className="connection-mini-fields"><span>{t("Versand") + " "}<i>{platform==='tiktok'?t("TikTok-Inbox"):t("Automatisch")}</i></span><span>{t("Ziel") + " "}<i>{t("Ihr bestätigtes Konto")}</i></span><span>Status <i>{t("Nach Freigabe: Geplant")}</i></span></div><span className="connection-mini-action">{t("Inhalt prüfen und freigeben")}</span></>}
    </div>
   </div>
   <figcaption aria-live="polite"><p className="connection-journey-place">{t("Schritt") + " "}{active+1}{" " + t("von 5 ·") + " "}{current.where}</p><h3>{current.title}</h3><ol>{current.instructions.map(instruction=><li key={instruction}>{instruction}</li>)}</ol><p className="connection-journey-result"><Check size={16} aria-hidden="true"/><span><strong>{t("Daran erkennen Sie den fertigen Schritt:")}</strong> {current.done}</span></p>{active<2&&<><a className="connection-journey-link" href={CONNECTOR_SETUP[platform].url} target="_blank" rel="noopener noreferrer">{name}{" " + t("öffnen")}<ArrowUpRight size={15}/></a></>}<small>{t("Die Grafik erklärt den Ablauf. Die tatsächlichen Eingaben und Statusmeldungen finden Sie im Formular darunter. Anbieter können ihre Menüs ändern.")}</small></figcaption>
  </figure>
  <div className="connection-journey-controls"><button type="button" disabled={active===0} onClick={()=>setChosen(Math.max(0,active-1))}><ArrowLeft size={16}/>{t("Zurück")}</button><span>{active+1} / 5</span><button type="button" disabled={active===4} onClick={()=>setChosen(Math.min(4,active+1))}>{t("Weiter")}<ArrowRight size={16}/></button></div>
 </div>
</details>;
}
