import { additionalKeywords } from './keywords';
import { campaignSchema, launchPlan } from './model';
import type { Campaign, CampaignGroup, CampaignRecord } from './model';
const origin = 'https://sebmaschberger-coaching.vercel.app';
const shared = ['Kostenloses Erstgespräch','Sebastian Maschberger','Dein persönlicher 1:1-Plan','Training für deinen Alltag','Ein Plan, der zu dir passt','Online und persönlich'];
function group(id:string,name:string,intent:string,route:string,path1:string,path2:string,terms:string,headlines:string[],descriptions:string[]):CampaignGroup {
  return { id,name,intent,landing:origin+route,path1,path2,
    keywords:terms.split('|').map((term,index)=>({term,match:index<8?'Exact':'Phrase'})),
    headlines:[...headlines,...shared],descriptions };
}
const groups:CampaignGroup[]=[
group('online-coaching','01 | Online Fitness-Coaching','Hohe Kaufabsicht für persönliche Online-Begleitung. Einstieg über Coaching und dann ein kostenloses Erstgespräch.','/coaching','online','coaching',
'online fitness coaching|online fitness coach|online fitness coach männer|online fitness coaching männer|fitness coach online buchen|fitness coaching online buchen|1 zu 1 fitness coaching online|persönliches fitness coaching online|online coach fitness deutschland|fitness coach für männer online|online trainingscoaching männer|1 1 online coaching fitness|individuelles online fitness coaching|online coaching training ernährung|online coaching für männer training|fitness betreuung online|online coach sport ernährung|online trainingsberatung männer|fitness coaching mit trainingsplan online|fitness coach mit check ins|flexibles online fitness coaching|fitness training mit coach online|online coach für fitness anfänger|online fitness coaching beratung|online coaching fitness erstgespräch',
['Online Fitness-Coaching','Dein Fitnesscoach online','Online-Coaching für Männer','Persönlich begleitet','Training und Ernährung','Woche für Woche dranbleiben','Dein Plan mit Feedback','Mit Plan und Rückmeldung','Mach den ersten Schritt'],
['Ich begleite dich online mit einem klaren Plan für Training, Ernährung und deine Woche.','Wir schauen gemeinsam, was in deinen Alltag passt. Starte mit einem Erstgespräch.','Du bekommst einen Trainingsplan, persönliche Rückmeldung und Hilfe beim Dranbleiben.','Erzähl mir, was du ändern möchtest. Das erste Gespräch ist kostenlos.']),
group('maenner-ab-30','02 | Krafttraining ab 30','Suchanfragen rund um Krafttraining für Männer ab 30. Routinen, Technik und individuelle Einheiten passen zum Coaching-Angebot.','/coaching','krafttraining','maenner-ab-30',
'krafttraining männer ab 30|krafttraining coach männer 30|training männer ab 30 coach|fitness coaching männer ab 30|personal training männer ab 30|trainingsplan männer ab 30 coach|krafttraining 30 plus coaching|krafttraining für männer online coach|krafttraining männer anfänger coaching|online krafttraining männer über 30|krafttraining im alltag coach|ab 30 muskeln aufbauen coaching|krafttraining beratung männer 30|fitness coaching über 30|trainingsberatung ab 30|krafttraining mann 35 coaching|krafttraining 40 männer coach|fitness für männer über 40 coach|wieder stärker werden männer coach|training mit hanteln ab 30 coach|ganzkörpertraining männer online coach|krafttraining anfänger männer über 30|fitness coach ab 30 online|krafttraining einsteiger 35 coach|kräftiger im alltag coaching',
['Krafttraining für Männer 30+','Stärker im Alltag werden','Fitness-Coaching ab 30','Trainingsplan für Männer','Kraft mit guter Technik','Training in deinem Tempo','Ein Plan für mehr Kraft','Auf dein Niveau abgestimmt','Krafttraining online lernen'],
['Ich helfe Männern ab 30, mit Krafttraining anzufangen und eine Routine aufzubauen.','Ob Studio oder Zuhause, wir planen die Übungen passend zu deiner Zeit und Erfahrung.','Mehr Struktur für dein Training. Lass uns deinen Einstieg im Erstgespräch planen.','Du lernst die Übungen in deinem Tempo und bekommst Tipps für Technik und Fortschritt.']),
group('ernaehrung','03 | Ernährung für Männer','Persönliche Ernährungsberatung mit Gewohnheiten, einfachen Mahlzeiten und flexibler Planung. Zielseite Ernährung.','/ernaehrung','ernaehrung','maenner',
'ernährungsberatung männer online|ernährungscoach männer|online ernährungsberatung männer ab 30|ernährungscoaching männer online|ernährungscoach buchen männer|ernährungsberatung für sport männer|ernährungsplan mit coach männer|persönliches ernährungscoaching online|ernährung im alltag coach|gesunde ernährung alltag beratung männer|ernährungsberatung berufstätige männer|ernährungscoaching ohne tracking|ernährung ohne kalorien zählen coaching|ernährung gewohnheiten ändern coach männer|ernährungsberatung mit trainingsplan männer|online ernährung musterplan coach männer|ernährungscoach fitness männer online|ernährungsplan arbeiten männer coaching|ernährungsberatung unkompliziert online|rezepte ernährungscoaching für männer|ernährung meal prep coaching männer|ernährungsberatung männer 40 online|beratungsangebot ernährung männer online|ernährung und fitness coach männer|beratung essensplan männer ab 30',
['Ernährungscoaching für Männer','Ernährung für volle Wochen','Essensplan für deinen Alltag','Dein Ernährungscoach online','Rezepte, die zu dir passen','Ernährung ohne starre Regeln','Gute Routinen fürs Essen','Einfache Mahlzeiten planen','Mehr Struktur beim Essen'],
['Ich helfe dir, Mahlzeiten und Gewohnheiten zu finden, die in deine Arbeitswoche passen.','Plane Essen, das du gerne isst. Wir finden gemeinsam Portionen und Rezeptideen.','Du möchtest weniger grübeln, was du kochst? Lass uns im Erstgespräch anfangen.','Flexible Orientierung für Einkauf, Mittagessen und volle Tage. Persönlich begleitet.']),
group('wiedereinstieg','04 | Wiedereinstieg ins Training','Nutzer mit konkretem Vorhaben nach einer Sportpause. Sanfter Einstieg mit realistischem Wochenplan und persönlicher Begleitung.','/coaching','wiedereinstieg','training',
'wiedereinstieg krafttraining coach|wiedereinstieg fitness coaching|nach sportpause wieder trainieren coach|wieder ins training kommen coach|fitness wiedereinstieg männer coach|fitness anfänger männer online coach|sport wieder anfangen coaching|krafttraining einstieg coach männer|training wieder anfangen nach pause coach|trainingsplan für wiedereinstieg mit coach|wieder fit werden coach männer|wieder trainieren lernen männer ab 30|betreuter einstieg fitness training|krafttraining nach langer pause coaching|personal trainer für wiedereinstieg|fitness trainer für sportanfänger online|coach für trainingsroutine wiedereinstieg|neu anfangen fitness coaching|einsteiger krafttraining beratung online|training von vorne anfangen coach|anfänger training betreuung zuhause|wiedereinstieg gym online trainer|wiedereinstieg zuhause training coach|schritt für schritt fitness anfangen coach|training nach auszeit online beratung',
['Wieder ins Training finden','Coaching für Wiedereinstieg','Krafttraining nach der Pause','Dein Einstieg mit System','Zurück zu deiner Routine','Starte da, wo du gerade bist','Schritt für Schritt starten','Trainingswoche mit Struktur','Wieder regelmäßig trainieren'],
['Nach einer Pause wieder trainieren? Ich helfe dir, mit einer machbaren Woche einzusteigen.','Wir wählen Übungen und Einheiten, die sich für deinen aktuellen Alltag gut anfühlen.','Du willst wieder anfangen und dranbleiben? Erzähl mir im Erstgespräch von deiner Woche.','Wir starten mit wenigen passenden Einheiten. Du bekommst einen Plan und Rückmeldung.']),
group('job-familie','05 | Fit trotz Job und Familie','Praktischer Start für Männer mit wenig Zeit. Suchintention direkt mit Anpassung an Termine, Alltag und Trainingsort bedienen.','/coaching','fit-im-alltag','wenig-zeit',
'fitness coaching wenig zeit|fitness coach berufstätige männer|training job familie coaching|fitness für berufstätige coach|fit im alltag online coaching|fitness coaching viel arbeit|training trotz wenig zeit coach|krafttraining berufstätige männer coach|trainingsplanung wenig zeit mit coach|fitness coach für väter|krafttraining mit familie und job coach|fitness coaching stressiger alltag|training in volle woche integrieren coach|30 minuten krafttraining coaching|online coaching für volle wochen|fit bleiben im beruf coaching|training zuhause wenig zeit coach|coach fitness alltag anpassen|fitness beratung beruf und familie|trainingsroutine für schichtarbeit coach|fit werden trotz bürojob coaching|kurze workouts mit coach männer|coach für konsequentes training im alltag|fitnessplanung für vielbeschäftigte|online betreuung training flexibel job',
['Fit trotz Job und Familie','Training mit wenig Zeit','Fitness für Berufstätige','Machbare Trainingswochen','Trainiere auch zuhause','Deine Woche im Mittelpunkt','Zeit für Bewegung finden','Kurze Einheiten mit Plan','Coaching für volle Tage'],
['Job, Familie und Termine gehören dazu. Ich helfe dir, Training in deine Woche einzubauen.','Wir finden Zeitfenster und Übungen, die du im Studio oder zuhause umsetzen kannst.','Kurze Einheiten mit klarer Richtung. Lerne mich im kostenlosen Erstgespräch kennen.','Ich passe Plan und Rückmeldung an deine Woche an. So kannst du flexibel dranbleiben.']),
group('personal-training','06 | Personal Training online','Anfragen mit konkreter Absicht, einen Personal Trainer für Online-Training und persönliche Rückmeldung zu finden.','/coaching','personal','training',
'personal trainer online männer|online personal training männer|personal trainer online buchen|personal training online deutschland|personal trainer für männer zuhause online|personal coach training online|personal trainer krafttraining online|personal trainer ernährung online männer|personal training mit trainingsplan online|personal trainer remote krafttraining|personal trainer per video online|personal trainer trainingsroutine männer|deutscher personal trainer online|trainer für krafttraining zuhause online|personal training mit feedback männer|trainingscoach für männer 1 zu 1|individuelle trainingsbetreuung online männer|fitness personal trainer remote buchen|personal trainer zuhause kraft und fitness online|persönlicher trainer trainingsplan und ernährung|personal trainer online erstberatung|individuelles personal training online buchen|personal trainer mit online betreuung|personal trainer online männliche anfänger|personal training für zuhause und studio online',
['Personal Training online','Dein Trainer für Kraft','Online Personal Trainer','Individueller Trainingsplan','Training zuhause oder Studio','Feedback zu deinem Training','Dein Trainer im Alltag','Übungen passend für dich','Persönliche Betreuung'],
['Mein Online-Coaching hilft dir beim Krafttraining zuhause oder im Studio. Mit Feedback.','Wir sprechen über deine Ziele, dein Training und deine Zeit. Buche ein Erstgespräch.','Ich erstelle deinen Trainingsplan und begleite dich bei der Umsetzung deiner Woche.','Du willst eine feste Ansprechperson fürs Training? Lass uns kostenlos kennenlernen.'])
];
const previousStart = '25 € pro Tag als editierbarer Vorschlag. Zuerst die Gruppen mit der stärksten Buchungsabsicht beobachten. Kampagne in Google Ads pausiert importieren.';
const start = '10 € pro Tag zum Start. Die Startauswahl enthält zuerst Online Fitness-Coaching und Personal Training online mit je acht genau passenden Keywords. Lade Keywords und Anzeigen der Startauswahl als CSV. Importiere sie pausiert und aktiviere sie nach deiner Prüfung.';
const draft: Campaign = {
  name:'Sebastian | Suche DE | Erstgespräch',locations:'Deutschland · Präsenz in Zielregion',language:'Deutsch',dailyBudget:10,
  objective:'Qualifizierte Anfrage für das kostenlose Erstgespräch',
  bid:'Suchnetzwerk · Start mit Klicks maximieren. Auf Conversions umstellen, wenn qualifizierte Anfragen zuverlässig erfasst werden.',
  setup:[
    'Suchnetzwerk für Deutschland. Deutsch. Suchnetzwerk-Partner zum Start separat prüfen. Anzeigen und Budget vor der Veröffentlichung bestätigen.',
    start,
    'Ein kostenloses Erstgespräch ist der CTA. Primäres Ziel ist eine erfolgreich übermittelte Kontaktanfrage. Echte Buchungen getrennt messen. Beispieltermine zählen als Vorschau.',
    'Conversion erst nach erfolgreicher serverseitiger Übermittlung erfassen. Google-Tag oder GA4 sowie Einwilligung prüfen. In Google Ads die primäre Aktion und Doppelzählungen kontrollieren.',
    'Zielseiten öffnen und die Anzeige auf einem Smartphone gegenlesen. Standort, Tagesbudget und Sprache vor dem Start in Google Ads überprüfen.',
    'Nach dem Start tatsächliche Suchanfragen, Ausgaben und gebuchte Gespräche prüfen. Ergänze Ausschlüsse bei Streuverlust. Erweitere die Auswahl mit passenden Keywords aus den übrigen Gruppen, sobald die Anfragequalität passt. Im Keyword-Planer lassen sich Suchvolumen und Gebote für Deutschland abschätzen.'
  ].join('\n\n'),
  groups,
  negative:'jobs|stellenangebot|ausbildung|studium|lizenzerwerb|gehalt|praktikum|vollzeit stelle|fitness influencer jobs|vorlage pdf|pdf download|trainingsplan gratis|kostenlose trainings app|kostenloser trainingsplan download|fitness studio in meiner nähe|gym mitgliedschaft|geräte kaufen|hanteln kaufen|gebraucht kaufen|supplemente bestellen|proteinpulver kaufen|anabolika|steroide kaufen|wettkampf vorbereiten|bodybuilding wettkampf|trainerschein|rehabilitation|physiotherapie praxis|kalorienrechner|gratis abnehm app'.split('|').map(term=>({term,match:'Phrase'})),
  sitelinks:[
    {title:'Kostenloses Erstgespräch',line1:'Lerne Sebastian persönlich kennen',line2:'Erzähl mir von deinem Alltag',landing:origin+'/kontakt'},
    {title:'So läuft das Coaching',line1:'Dein Plan für Training und Alltag',line2:'Mit persönlicher Begleitung',landing:origin+'/coaching'},
    {title:'Ernährung im Alltag',line1:'Einfacher planen und kochen',line2:'Mit flexiblen Mahlzeiten',landing:origin+'/ernaehrung'},
    {title:'Über Sebastian',line1:'Erfahre, wie ich dich begleite',line2:'Lerne meine Erfahrung kennen',landing:origin+'/ueber-sebastian'},
    {title:'Deine Woche planen',line1:'Finde Zeitfenster für Training',line2:'Online direkt ausprobieren',landing:origin+'/wochenplan'}
  ],
  callouts:['Persönliche Rückmeldung','Training ab 30','Online auf Deutsch','Für zuhause und Studio','Flexible Ernährung','Kostenloser Einstieg']
};

function additionalFor(id: string): CampaignGroup['keywords'] {
  const terms = additionalKeywords[id as keyof typeof additionalKeywords];
  return terms ? terms.trim().split('\n').map((term,index)=>({term,match:index<35?'Exact':'Phrase'})) : [];
}
export function seedCampaign() {
  return campaignSchema.parse({ ...draft, launch:launchPlan(draft), groups:draft.groups.map(group=>({
    ...group, keywords:[...group.keywords,...additionalFor(group.id)]
  })) });
}

export function updateEarlierDraft(record: CampaignRecord): CampaignRecord {
  const {campaign} = record;
  if (campaign.launch) return record;
  const key = (term:string)=>term.trim().toLowerCase().replace(/\s+/gu,' ');
  const used = new Set(campaign.groups.flatMap(group=>group.keywords.map(keyword=>key(keyword.term))));
  const expanded = campaign.groups.map(group=>{
    const original = groups.find(row=>row.id===group.id)?.keywords;
    if (!original || original.length !== group.keywords.length || original.some((entry,index)=>
      entry.term!==group.keywords[index].term || entry.match!==group.keywords[index].match)) return group;
    const additions = additionalFor(group.id).filter(entry=>{
      const name=key(entry.term);
      if (used.has(name)) return false;
      used.add(name);
      return true;
    });
    return {...group,keywords:[...group.keywords,...additions]};
  });
  return { revision:record.revision+1, status:'draft', approvedAt:null, campaign:{
    ...campaign, groups:expanded, launch:launchPlan(campaign), dailyBudget:draft.dailyBudget,
    setup:campaign.setup.replace(previousStart,start)
  } };
}
