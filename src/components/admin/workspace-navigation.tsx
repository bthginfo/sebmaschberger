"use client";

import { CalendarDays, ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import styles from "./workspace-navigation.module.css";

export const workspaceShellClass = styles.workspaceShell;

type NavigationItem<View extends string> = { id: View; label: string; icon: LucideIcon };

const groups = [
  { title: ["Website", "Website"], ids: ["editor", "pages", "blog", "media", "brand-kit", "restaurant-menu", "templates"], expanded: true },
  { title: ["Tagesgeschäft", "Daily work"], ids: ["inquiries", "appointments", "client-portal", "reservations", "commerce", "orders", "documents", "cards"], expanded: true },
  { title: ["Verein & Training", "Club & training"], ids: ["club", "coach"], expanded: true },
  { title: ["Kommunikation", "Communications"], ids: ["social", "planner", "newsletter", "google-ads"], expanded: false },
  { title: ["Einstellungen & Hilfe", "Settings & help"], ids: ["settings", "account", "team", "agents", "security", "help"], expanded: false },
];

function NavigationGroup({ title, initiallyOpen, active, tourOpen, children }: {
  title: string; initiallyOpen: boolean; active: boolean; tourOpen: boolean; children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(initiallyOpen || active);
  useEffect(() => { if (active) setOpen(true); }, [active]);
  const expanded = open || tourOpen;
  return <div className={styles.group}>
    <button className={styles.disclosure} type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setOpen(!expanded)}>
      <span>{title}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    <div id={id} className={styles.links} hidden={!expanded}>{children}</div>
  </div>;
}

export function WorkspaceNavigation<View extends string>({ items, view, onNavigate, language = "de", newInquiries = 0, channels, tourOpen = false, darkSidebar = false }: {
  items: readonly NavigationItem<View>[]; view: View; onNavigate: (id: View) => void; language?: string;
  newInquiries?: number; channels?: { label: string; open: () => void }; tourOpen?: boolean; darkSidebar?: boolean;
}) {
  const locale = language === "en" ? 1 : 0;
  const overview = ["dashboard", "analytics", "statistics"];
  const ungrouped = items.filter(item => !overview.includes(item.id) && !groups.some(group => group.ids.includes(item.id)));
  function button(item: NavigationItem<View>) {
    return <button key={item.id} type="button" className={styles.link} data-admin-view={item.id}
      aria-current={view === item.id ? "page" : undefined} onClick={() => onNavigate(item.id)}>
      <item.icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{item.label}</span>
      {item.id === "inquiries" && newInquiries > 0 && <span className="cms-nav-badge">{newInquiries}</span>}
    </button>;
  }
  return <nav className={styles.navigation} data-dark-sidebar={darkSidebar || undefined} aria-label={locale ? "Workspace" : "Arbeitsbereich"}>
    {overview.map(id => items.find(item => id === item.id)).map(item => item && button(item))}
    {groups.map(group => {
      const entries = group.ids.flatMap(id => items.filter(item => item.id === id));
      if (!entries.length) return null;
      return <NavigationGroup key={group.ids[0]} title={group.title[locale]} initiallyOpen={group.expanded}
        active={entries.some(item => item.id === view)} tourOpen={tourOpen}>
        {entries.map(button)}
        {channels && group.ids.includes("planner") && entries.some(item => item.id === "planner") &&
          <button className={styles.link} type="button" onClick={channels.open}><CalendarDays size={18} aria-hidden="true" /><span>{channels.label}</span></button>}
      </NavigationGroup>;
    })}
    {ungrouped.length > 0 && <NavigationGroup title={locale ? "More areas" : "Weitere Bereiche"} initiallyOpen active={ungrouped.some(item => item.id === view)} tourOpen={tourOpen}>
      {ungrouped.map(button)}
    </NavigationGroup>}
  </nav>;
}
