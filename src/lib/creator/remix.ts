import type { ContentItem, CreatorRemixModule, SectionContent } from "../types";

export const remixModuleLabels: Record<CreatorRemixModule, string> = {
  content: "Content & Videos", community: "Live & Community", shop: "Shop & Drops", kit: "Media Kit & Kooperationen",
};

/** Neutral defaults: no customer assets, accounts, claims or preconfigured integrations. */
export function createRemixContent(): SectionContent {
  return {
    heading: "DEIN MIX.",
    text: "Vier Bausteine. Was brauchst du?",
    subheading: "DEINE WELT.",
    caption: "Ein Layoutbeispiel. Deinen Look entwickeln wir zusammen.",
    primaryLabel: "Diesen Mix besprechen", primaryHref: "/kontakt", secondaryLabel: "Zurück zum Start",
    items: [
      { id: "remix-content", remixModule: "content", title: remixModuleLabels.content, label: "Content", text: "Deine Inhalte haben einen eigenen Ort.", icon: "Video", details: ["previewTitle|NEUES VON DIR.", "previewText|Videos, Geschichten und alles, was bleiben soll.", "previewMeta|Dein Content", "previewAction|Entdecken"] },
      { id: "remix-community", remixModule: "community", title: remixModuleLabels.community, label: "Community", text: "Termine und Austausch näher zusammen.", icon: "CalendarDays", details: ["previewTitle|WIR SEHEN UNS.", "previewText|Live-Termine und Raum für deine Community.", "previewMeta|Dein nächstes Live", "previewAction|Dabei sein"] },
      { id: "remix-shop", remixModule: "shop", title: remixModuleLabels.shop, label: "Shop", text: "Eigene Produkte direkt bei dir.", icon: "Store", details: ["previewTitle|DEIN NÄCHSTER DROP.", "previewText|Eigene Produkte. Dein eigener Shop.", "previewMeta|Dein Shop", "previewAction|Zum Drop"] },
      { id: "remix-kit", remixModule: "kit", title: remixModuleLabels.kit, label: "Media Kit", text: "Alles für die nächste Zusammenarbeit.", icon: "FileText", details: ["previewTitle|LET’S MAKE IT.", "previewText|Dein Profil und ein klarer Weg zur Anfrage.", "previewMeta|Zusammenarbeiten", "previewAction|Media Kit"] },
      { id: "remix-preset-content", title: "Content first", text: "", remixSelection: ["content", "community"], tags: ["default"] },
      { id: "remix-preset-live", title: "Community & Deals", text: "", remixSelection: ["content", "community", "kit"] },
      { id: "remix-preset-drop", title: "Drop ready", text: "", remixSelection: ["content", "shop"] },
      { id: "remix-preset-all", title: "Alles zusammen", text: "", remixSelection: ["content", "community", "shop", "kit"] },
      { id: "remix-ui", title: "Bedienung des Website-Remix", text: "Alle Beschriftungen bleiben redaktionell editierbar.", tags: ["ui"], details: ["options|Mehr Optionen", "custom|Eigener Mix", "choose|Was soll deine Website können?", "presets|Mit einem Mix starten", "preview|Deine Website-Vorschau", "previewTitle|Deine eigene Adresse", "example|Fiktives Layoutbeispiel", "summary|Dein Mix", "summaryIntro|Ich interessiere mich für eine eigene Creator-Website mit diesen Bausteinen:", "summaryOutro|Meine Idee dazu:", "emptyTitle|PLATZ FÜR DEINE IDEE.", "emptyText|Wähle einen Baustein. Deine Website wächst mit deiner Auswahl.", "none|Noch keine Bausteine ausgewählt", "count|Bausteine ausgewählt", "changed|Deine Vorschau wurde angepasst.", "copied|Dein Mix wurde kopiert.", "copy|Mix kopieren", "copyError|Kopieren ist gerade nicht möglich. Deine Auswahl bleibt erhalten.", "inquirySubject|Meine Creator-Website", "remove|Entfernen", "add|Hinzufügen", "resetDone|Dein Start-Mix ist wieder da."] },
    ],
  };
}

export function remixModules(items: ContentItem[] = []) {
  const seen = new Set<CreatorRemixModule>();
  return items.filter(item => {
    if (!item.remixModule || seen.has(item.remixModule)) return false;
    seen.add(item.remixModule); return true;
  });
}

export function selectedRemixModules(items: ContentItem[], selection: CreatorRemixModule[]) {
  return remixModules(items).filter(item => selection.includes(item.remixModule!));
}

/** The contact form consumes both query fields. The message remains editable before sending. */
export function remixInquiryHref(href: string | undefined, subject: string, message: string) {
  if (!href?.startsWith("/") || href.startsWith("//")) return href || "/kontakt";
  const url = new URL(href, "https://website.invalid");
  url.searchParams.set("service", subject.slice(0, 200));
  url.searchParams.set("message", message.slice(0, 12000));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function remixMessage(items: ContentItem[], selection: CreatorRemixModule[], intro: string, outro: string) {
  return [intro, ...selectedRemixModules(items, selection).map(item => `- ${item.title}`), "", outro].join("\n");
}
