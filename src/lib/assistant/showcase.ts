import type {SectionContent} from '@/lib/types';

/** Neutral, authored example for the optional assistant section. No provider is contacted. */
export function createAssistantShowcaseContent():SectionContent {
 return {
  subheading:'Optional im CMS',
  heading:'Ein Assistent. Weniger leere Seiten.',
  text:'Website-Texte überarbeiten, neue Seiten aufbauen und sich im CMS zurechtfinden. Auf Wunsch unterstützt ein Assistent – bis hin zu Social-Posts und passenden Content-Ideen.',
  caption:'Mit eigenem KI-Zugang auf Wunsch. Sie prüfen jeden Vorschlag vor dem Übernehmen.',
  items:[
   {id:crypto.randomUUID(),title:'Website-Texte',text:'Klarer formulieren, ohne Ihre Angaben zu verändern.',label:'Kürze diesen Text. Stelle Möbel nach Maß in den Mittelpunkt. Behalte die vorhandenen Leistungen bei.',tags:['rewrite']},
   {id:crypto.randomUUID(),title:'Seiten aufbauen',text:'Mit passenden Abschnitten aus Ihrer CMS-Bibliothek.',label:'Bereite eine neue Seite zu Möbeln nach Maß vor. Nutze die vorhandenen Abschnitte und nur unsere genannten Leistungen.',tags:['page']},
   {id:crypto.randomUUID(),title:'CMS-Hilfe',text:'Bedienung, Anfragen, Shop und Kanäle verständlich erklärt.',label:'Erkläre mir den nächsten sinnvollen Schritt im CMS.',tags:['help']},
   {id:crypto.randomUUID(),title:'Social-Posts',text:'Bildtext und Caption aus Ihrem Inhalt vorbereiten.',label:'Bereite einen Social-Post über Möbel nach Maß vor. Nutze nur die Leistungen aus diesem Text.',tags:['social']},
   {id:crypto.randomUUID(),title:'Content-Ideen',text:'Konkrete Themen finden, die zu Ihrem Angebot passen.',label:'Sammle drei konkrete Content-Ideen zu Planung, Fertigung und Montage von Möbeln nach Maß.',tags:['ideas']},
   {id:crypto.randomUUID(),title:'Möbel nach Maß',text:'Wir möchten Ihnen einen Überblick über unsere Leistungen geben. Wir planen, fertigen und montieren Möbel nach Maß. Bei Fragen können Sie gerne Kontakt mit uns aufnehmen.',meta:'Beispielbetrieb',tags:['example']},
  ],
 };
}
