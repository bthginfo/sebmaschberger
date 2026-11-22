"use client";

import { useContext } from "react";
import type { SiteConfig } from "@/lib/types";
import { WITHDRAWAL_PATH, WITHDRAWAL_LABEL } from "@/lib/commerce/withdrawal";
import { footerConfig } from "@/lib/site-config";
import { ContentLink, SiteInteractionContext } from "./editable";
import { ArrowUpRight } from "lucide-react";

export function FooterNavigation({ site, editable, className = "", arrows = false }: { site: SiteConfig; editable?: boolean; className?: string; arrows?: boolean }) {
  const footer = footerConfig(site);
  if (!footer.columns.length) return null;
  return <div className={`ws-footer-navigation ${className}`} data-column-count={footer.columns.length}>
    {footer.navigationHeading && <h2>{footer.navigationHeading}</h2>}
    <div className="ws-footer-nav-columns">{footer.columns.map((column) => <nav key={column.id} aria-label={column.title || footer.navigationHeading || "Weitere Seiten"}>
      {column.title && column.title !== footer.navigationHeading && <h3>{column.title}</h3>}
      {column.links.map((link, index) => <ContentLink key={`${link.href}-${index}`} href={link.href} editable={editable}>{link.label}{arrows && <ArrowUpRight size={16} />}</ContentLink>)}
    </nav>)}</div>
  </div>;
}

export function FooterLegalLinks({ site, editable }: { site: SiteConfig; editable?: boolean }) {
  const { isolated } = useContext(SiteInteractionContext);
  const withdrawal = !isolated && site.modules?.commerce?.consumerSales;
  const links = footerConfig(site).legalLinks.filter(link => !withdrawal || link.href !== WITHDRAWAL_PATH);
  return <>{links.map((link, index) => <ContentLink key={`${link.href}-${index}`} href={link.href} editable={editable}>{link.label}</ContentLink>)}
    {withdrawal && <ContentLink href={WITHDRAWAL_PATH} editable={editable} className="ws-withdrawal-link">{WITHDRAWAL_LABEL}</ContentLink>}</>;
}
