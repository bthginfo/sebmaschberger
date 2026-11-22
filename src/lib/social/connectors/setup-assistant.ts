import {z} from 'zod';
import {connectorProviderSchema,CONNECTOR_SPECS} from './model';
import {CONNECTOR_SETUP} from './setup-guide';

// Only public platform names and a setup step enter the assistant context.
export const connectionHelpSchema=z.object({
 platform:connectorProviderSchema,
 step:z.enum(['app','account','target','connected'])
}).strict();
export type ConnectionHelp=z.infer<typeof connectionHelpSchema>;
export const CONNECTION_SETUP_STEPS=[
 {key:'app',label:'Einmal vorbereiten'},
 {key:'account',label:'Anmelden'},
 {key:'target',label:'Konto auswählen'}
] as const;

export function connectionNextStep({platform,step}:ConnectionHelp){
 const name=CONNECTOR_SPECS[platform].label;
 const next=step==='app'
  ?{title:'Zuerst die Verbindung erlauben',text:platform==='instagram'?'Neue Meta-Apps benötigen ein Business-Portfolio und drei Angaben: Meta App-ID, Meta App-Secret und Konfigurations-ID. Die Anmeldung Ihres Profils folgt danach.':`Dafür legen Sie einmal einen Zugang bei ${name} an. Die App-Daten tragen Sie unten ein. Sie müssen nichts programmieren.`}
  :step==='account'
   ?platform==='bluesky'
    ?{title:'Ein eigenes App-Passwort verwenden',text:'Erstellen Sie in Bluesky ein App-Passwort für diesen Planer. Ihr normales Kontopasswort wird hier nicht benötigt.'}
    :{title:`Jetzt bei ${name} anmelden`,text:'Die Vorbereitung ist gespeichert. Melden Sie sich unten beim Anbieter an und erlauben Sie den Zugriff. Danach wählen Sie Ihr Konto aus.'}
   :step==='target'
    ?{title:'Das richtige Konto auswählen',text:'Die Anmeldung ist zurück. Wählen Sie unten das Profil oder den Kanal, den Sie mit diesem Planer nutzen möchten.'}
    :{title:'Verbindung verwalten und Beiträge planen',text:'Ihre gespeicherten Verbindungen stehen unten. Mit „Verbindung prüfen“ können Sie den Kontozugriff erneut testen.'};
 return{...next,prompt:`Erklären Sie mir den Schritt „${next.title}“ für ${name} einfach und Schritt für Schritt. Wo muss ich klicken, und welche Angaben brauche ich?`};
}

export function connectionHelpProposal(context:ConnectionHelp){
 const spec=CONNECTOR_SPECS[context.platform],setup=CONNECTOR_SETUP[context.platform],next=connectionNextStep(context);
 let answer:string;
 if(context.platform==='bluesky'&&context.step!=='connected'){
  answer='1. Öffnen Sie über den Bluesky-Link die Seite „App-Passwörter“. Erstellen Sie dort ein Passwort für diesen Planer.\n\n2. Tragen Sie unten Ihren Bluesky-Handle, dieses App-Passwort und einen Namen für die Verbindung ein. Ihr normales Bluesky-Passwort bleibt bei Bluesky.\n\n3. Wählen Sie „Bluesky verbinden und prüfen“. Der Planer prüft dann den Zugang.\n\nDas App-Passwort gehört ausschließlich in das geschützte Passwortfeld, niemals in diesen Chat.';
 }else if(context.step==='app'){
  answer=`Eine „App“ ist hier die einmalige Verbindungserlaubnis für den Planer. Sie müssen keine Software entwickeln.\n\n1. Öffnen Sie „Einrichtung bei ${spec.label} öffnen“. Die Anmeldung und gegebenenfalls eine Anbieterprüfung finden dort statt.\n\n2. Folgen Sie der Anleitung „So geht die Vorbereitung“. Die „Rücksprungadresse“ kopieren Sie unverändert aus dem CMS zum Anbieter. Sie bringt Sie nach der Anmeldung zurück. Beim Anbieter heißt das Feld oft „Redirect URI“ oder „Callback URL“.\n\n3. Kopieren Sie ${setup.clientIdLabel} und App-Secret aus dem Anbieterportal in die gleichnamigen Felder hier. Die ID erkennt den Zugang; das Secret schützt ihn wie ein Passwort. Speichern Sie beide über „App-Daten speichern“.\n\n4. Danach können Sie sich direkt bei ${spec.label} anmelden. App-Daten gespeichert heißt noch nicht Konto verbunden.\n\n${setup.review}\n\nSecrets, Passwörter und Tokens gehören nur in die geschützten Eingabefelder, niemals in diesen Chat.`;
 }else if(context.step==='account'){
  answer=`1. Klicken Sie auf „Bei ${spec.label} anmelden“. Es öffnet sich die offizielle Anmeldung des Anbieters. Ihr Kontopasswort geben Sie ausschließlich dort ein.\n\n2. Prüfen Sie, welchen Zugriff der Planer erhalten soll, und bestätigen Sie ihn beim Anbieter.\n\n3. Kehren Sie zum Planer zurück. Wählen Sie anschließend das bestätigte Profil, die Seite oder den Kanal und klicken Sie auf „Ausgewähltes Konto verbinden“.\n\nWenn die Anmeldung scheitert, prüfen Sie zuerst die Rücksprungadresse und die Freigaben aus „So geht die Vorbereitung“. Der Assistent kann diese Freigaben erklären; er kann sie nicht für Sie erteilen.\n\nEs wird noch kein Beitrag veröffentlicht.`;
 }else if(context.step==='target'){
  answer='1. Sehen Sie sich die vom Anbieter bestätigten Konten in der Auswahlliste an.\n\n2. Wählen Sie das Profil, die Seite, Pinnwand oder den Kanal, den Sie hier verwenden möchten. Prüfen Sie den Namen und die ausgewählte Marke.\n\n3. Klicken Sie auf „Ausgewähltes Konto verbinden“. Erst die Antwort des Anbieters bestätigt die Verbindung.\n\nFehlt das gewünschte Konto, prüfen Sie beim Anbieter Ihre Kontorolle und Freigabe. Starten Sie die Anmeldung bei Bedarf erneut. Der Assistent wählt kein Konto aus und gibt keine Beiträge frei.';
 }else{
  answer='Die Seite zeigt den gespeicherten Verbindungsstatus. Diese Erklärung führt keine neue Prüfung beim Anbieter aus.\n\n1. Mit „Verbindung prüfen“ testen Sie den aktuellen Kontozugriff. Bei einem abgelaufenen Zugang melden Sie sich erneut an.\n\n2. Wählen Sie im Post-Planer einen Beitrag, das Konto und den Zeitpunkt. Prüfen Sie Inhalt und Medien vor der eigenen Versandfreigabe.\n\n3. Über „Trennen“ beenden Sie die lokale Verbindung. Die Freigabe können Sie zusätzlich beim Anbieter widerrufen.\n\nDie Verbindung allein veröffentlicht keinen Beitrag.';
 }
 if(context.platform==='instagram')answer+='\n\nFür neue Meta-Apps wählen Sie Unified Login. Im Meta-Dashboard zuerst Profilzugriff und Veröffentlichung hinzufügen, dann eine Konfiguration mit Systemnutzer-Token und erforderlichen Instagram-Konten erstellen. Meta App-ID, Meta App-Secret und Konfigurations-ID in die gleichnamigen CMS-Felder eintragen. Bei bestehenden Apps mit bisherigem Instagram Login verwenden Sie stattdessen deren Instagram App-ID und Secret.\n\nBeim Anmelden wählen Sie das Business-Portfolio mit Ihrem Professional-Profil. Accounts Center allein reicht dafür nicht. Fehlt Ihr Profil, öffnen Sie im Business-Portfolio Einstellungen → Konten → Instagram-Konten. Prüfen Sie unter „Personen“, ob Ihr Facebook-Konto Inhalte verwalten darf. Falls dort niemand zugewiesen ist, lässt eine berechtigte Person den benötigten Inhaltszugriff zuweisen. Ein Zugang lässt sich pro Anwendung für mehrere Kunden nutzen; jedes Kundenkonto muss separat zustimmen. Eigenständige Kunden-Websites behalten ihre eigene Einrichtung. Das CMS verwendet die von Meta bestätigte Laufzeit. Bei Ablauf erneut anmelden; eine widerrufene Freigabe wird nicht automatisch umgangen.';
 if(context.platform==='instagram'&&['account','connected'].includes(context.step))answer+='\n\nGehören die Meta-App und das Instagram-Konto zu Ihrem eigenen Business-Portfolio? Dafür gibt es unten zusätzlich „Eigene Meta-App und eigenes Konto? Systemnutzer verwenden“. Öffnen Sie dort die vier Schritte. Ein eigener Employee-Systemnutzer erhält nur die eigene App und das benötigte Instagram-Konto. Die Instagram-Konto-ID kopieren Sie aus Meta in das gleichnamige Feld. Sein 60-Tage-Token gehört ausschließlich in das geschützte Passwortfeld, niemals hier in den Chat. Nach der Prüfung wählen Sie das bestätigte Profil separat aus. Diesen eigenen Zugang kann der Server vor Ablauf erneuern, solange Meta die Rechte weiterhin bestätigt. Die normale Kundenanmeldung und deren Wiederanmeldung bleiben ein eigener Weg.';
 if(context.platform==='tiktok')answer+='\n\nBei TikTok wird das Video nach Ihrer Freigabe in den TikTok-Posteingang übergeben. Sie prüfen es dort und schließen die Veröffentlichung in TikTok ab.';
 return{kind:'help' as const,title:next.title,summary:'Schritt-für-Schritt-Hilfe. Der Assistent erklärt; Anmeldung und Freigaben bestätigen Sie selbst.',answer,actions:[]};
}
