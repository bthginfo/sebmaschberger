"use client";

import { FooterLegalLinks } from "@/components/site/footer-navigation";

import { useContext, useRef, useState, useEffect } from "react";
import { ArrowLeft, ArrowUpRight, Menu, RotateCcw, ShoppingBag, X, Zap } from "lucide-react";
import type { CreatorLayoutProps } from "@/lib/creator/types";
import { ContentLink, SiteInteractionContext } from "@/components/site/editable";
import { creatorBase, useCreatorCart } from "../shop/cart-state";
import styles from "./profile.module.css";
import { useScrollNavigation } from "../motion/creator-motion";

export function CreatorProfileLayout(props: CreatorLayoutProps) {
  return <ProfileShell {...props} />;
}

function ProfileShell({ cartHref, page, site, editable = false, children }: CreatorLayoutProps) {
  const [menu, setMenu] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  useScrollNavigation(navigationRef, page.id, menu, editable);
  const { state, reset, ready } = useCreatorCart();
  const { isolated,localMediaOnly } = useContext(SiteInteractionContext);
  const count = state.lines.reduce((n, line) => n + line.quantity, 0);
  const base = creatorBase(site, isolated);
  const cartDestination=localMediaOnly?`${base}/warenkorb`:site.modules?.commerce?.enabled?cartHref:undefined;
  const Main = editable ? "div" : "main";
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setMenu(false); buttonRef.current?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  return <div className={styles.profile} data-editable={editable ? "true" : "false"}>
    <div className={styles.navShell} ref={navigationRef} data-creator-profile-navshell="">
    {isolated && <div className={styles.demoBar} data-creator-demo-topbar=""><ContentLink href="/" editable={editable}><ArrowLeft size={14} />{site.footer?.navigationHeading || "Zur Hauptseite"}</ContentLink><span>{site.legalName}</span><button type="button" disabled={!ready} onClick={() => { reset(); try { ["creator-program", "creator-poll"].forEach(prefix => sessionStorage.removeItem(`${prefix}:${site.modules?.creator?.demoBasePath || site.name}:v1`)); } catch {} setResetDone(true); setResetCount(count => count + 1); }}>{resetDone ? "Demo zurückgesetzt" : "Demo zurücksetzen"}<RotateCcw size={13} /></button></div>}
    <header className={styles.header} data-creator-profile-header="">
      <ContentLink href={base || "/"} editable={editable} className={styles.wordmark} label={`${site.name} – Startseite`}>{site.name}<Zap size={24} fill="currentColor" strokeWidth={1} /></ContentLink>
      <nav className={styles.nav} aria-label="Creator-Navigation">{site.navigation.map(item => <ContentLink key={item.href} href={item.href} editable={editable} className={item.href === `${base}/${page.slug}` || (!page.slug && item.href === base) ? styles.current : ""}>{item.label}</ContentLink>)}</nav>
      <div className={styles.actions}>{cartDestination&&<ContentLink href={cartDestination} editable={editable} className={styles.cart} label={`${isolated ? "Demo-Warenkorb" : "Warenkorb"}, ${count} Artikel`}><ShoppingBag size={20} /><span key={count}>{count}</span></ContentLink>}<button ref={buttonRef} className={styles.menuButton} data-creator-profile-menu="" type="button" aria-label={menu ? "Menü schließen" : "Menü öffnen"} aria-expanded={menu} aria-controls="mika-menu" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></div>
    </header>
    {menu && <nav id="mika-menu" className={styles.mobileNav} aria-label="Mobile Creator-Navigation">{site.navigation.map(item => <div key={item.href} onClick={() => setMenu(false)}><ContentLink href={item.href} editable={editable}>{item.label}<ArrowUpRight size={22} /></ContentLink></div>)}{isolated && <ContentLink href={`${base}/cms`} editable={editable}>Diese Website bearbeiten<ArrowUpRight size={22} /></ContentLink>}</nav>}
    </div>
    <Main key={resetCount} id="hauptinhalt" tabIndex={editable ? undefined : -1} className={styles.main}>{children}</Main>
    <footer className={styles.footer}><div className={styles.footerTop}><ContentLink href={base || "/"} editable={editable} className={styles.footerBrand}>{site.footer?.brandText || site.name}<Zap fill="currentColor" strokeWidth={1} /></ContentLink>{site.footer?.ctaLabel && <ContentLink href={site.footer.ctaHref} editable={editable} className={styles.footerCta}>{site.footer.ctaLabel}<ArrowUpRight size={25} /></ContentLink>}</div><p>{site.footerText}</p><div className={styles.footerBottom}><span>{site.footer?.copyright}</span><div><FooterLegalLinks site={site} editable={editable} /></div></div></footer>
  </div>;
}
