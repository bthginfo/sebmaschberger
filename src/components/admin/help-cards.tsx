"use client";

import {ArrowUpRight,CalendarDays,Check,FileText,Mail,PanelsTopLeft,ShoppingBag} from 'lucide-react';
import {useAdminLanguage} from './admin-language';
import type {AdminView} from './admin-app';
import styles from './help-cards.module.css';

type Props={commerce?:boolean;appointments?:boolean;onNavigate:(view:AdminView)=>void;onEmail?:()=>void};
export function HelpCards({commerce,appointments,onNavigate,onEmail}:Props) {
  const {language}=useAdminLanguage();
  const t=(de:string,en:string)=>language==='en'?en:de;
  const cards: {id:AdminView;icon:typeof Mail;title:string;steps:readonly string[];sketch:readonly string[]}[] = [
    {id:'editor' as const,icon:PanelsTopLeft,title:t('Website und Partnerlinks','Website and partner links'),
      steps:[t('Wähle eine Sprache und die passende Seite.','Choose a language and a page.'),
        t('Klicke in der Vorschau oder im Seitenaufbau auf den Abschnitt.','Open the section in the preview or outline.'),
        t('Prüfe Links und Kennzeichnung. Speichere und veröffentliche.','Review links and labels. Save and publish.')],sketch:['DE / EN',t('Abschnitt','Section'),t('Vorschau','Preview')]},
    ...(commerce?[{id:'commerce' as const,icon:ShoppingBag,title:t('Shop und Produkte','Shop and products'),
      steps:[t('Der Schalter oben im Shop ändert sofort die Sichtbarkeit.','The switch at the top changes visibility immediately.'),
        t('Bearbeite Beispielstatus, Preis, Bild und Sprachfassungen beim Produkt.','Edit sample status, price, image and languages on a product.'),
        t('Unter Einrichtung findest du Kasse und Zahlungsstatus.','Open Setup to preview checkout and check payment setup.')],sketch:[t('Shop sichtbar','Shop visible'),t('Produkt','Product'),t('Kasse','Checkout')]},
      {id:'documents' as const,icon:FileText,title:t('Rechnung und Bestellmails','Invoices and order emails'),
       steps:[t('Unter Vorlagen pflegst du Logo, Farben und Absenderdaten.','In Templates, edit the logo, colours and sender details.'),
         t('Öffne die PDF-Vorschau und die Vorlagen für Bestätigung und Erstattung.','Open the PDF preview and the confirmation and refund templates.'),
         t('Verbinde SMTP für den Versand. Die Zahlungsanbindung prüfst du im Shop.','Connect SMTP for delivery. Check the payment setup in Shop.')],sketch:['PDF',t('Bestätigt','Confirmed'),t('Erstattet','Refunded')]}]:[]),
    ...(appointments?[{id:'appointments' as const,icon:CalendarDays,title:t('Erstgespräche buchen lassen','Offer intro calls'),
      steps:[t('Setze Datum, Uhrzeit und Dauer eines freien Zeitfensters.','Choose the date, time and duration of an available slot.'),
        t('Buchungen, Umbuchungen und Absagen erscheinen unter Termine.','Bookings, rescheduling and cancellations appear in Appointments.'),
        t('Aktiviere Termin-Push in den App-Einstellungen. Mit SMTP erhalten du und dein Gast zusätzlich eine Mail mit dem passenden Link.','Enable appointment push alerts in App Settings. With SMTP you and your guest also get an email with the relevant link.')],sketch:['10:30','11:20',t('Gebucht','Booked')]}]:[]),
    {id:'inquiries' as const,icon:Mail,title:t('Postfach und Benachrichtigungen','Inbox and notifications'),
      steps:[t('Öffne neue Nachrichten unter Anfragen.','Open new messages in your inbox.'),
        t('Lege den Bearbeitungsstatus fest und speichere eine Notiz.','Set the inquiry status and save a note.'),
        t('Speichere die Verbindung und prüfe den Versand über eine Testmail.','Save the connection and check delivery with a test email.')],sketch:[t('Neue Nachricht','New message'),t('Antwort','Reply'),t('Notiz','Note')]},
  ];
  return <section className={styles.section}>
    <h2>{t('Direkt zu deinem nächsten Schritt','Find your next step')}</h2>
    <div className={styles.grid}>{cards.map(card=>{
      const Icon=card.icon;
      return <article key={card.id} className={styles.card}>
        <div className={styles.sketch} aria-hidden="true">
          <Icon size={24}/><div>{card.sketch.map((label,index)=><span key={label}>{index===0&&<Check size={15}/>} {label}</span>)}</div>
          <div className={styles.lines}><i/><i/><i/></div>
        </div>
        <h3>{card.title}</h3>
        <ol>{card.steps.map(step=><li key={step}>{step}</li>)}</ol>
        <div className={styles.links}>
          <button type="button" onClick={()=>onNavigate(card.id)}>{t('Bereich öffnen','Open workspace')}<ArrowUpRight size={15} aria-hidden="true"/></button>
          {(card.id==='inquiries'||card.id==='documents')&&onEmail&&<button type="button" onClick={onEmail}>{t('E-Mail-Versand','Email delivery')}<ArrowUpRight size={15} aria-hidden="true"/></button>}
        </div>
      </article>;
    })}</div>
  </section>;
}
