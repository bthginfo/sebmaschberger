"use client";

import { FooterLegalLinks } from "@/components/site/footer-navigation";

import {useRef,useState} from 'react';
import {Menu,X} from 'lucide-react';
import type {CreatorLayoutProps} from '@/lib/creator/types';
import {ContentLink} from '@/components/site/editable';
import {useEditorialMotion,useScrollNavigation} from '../motion/creator-motion';
import styles from './neutral-marketing.module.css';

/** Neutral Starter shell. Customer wordmarks and brand geometry stay in their own project. */
export function CreatorMarketingLayout({page,site,editable,children}:CreatorLayoutProps){
  const [open,setOpen]=useState(false);
  const opener=useRef<HTMLButtonElement>(null);
  const root=useRef<HTMLDivElement>(null);
  const header=useRef<HTMLElement>(null);
  useEditorialMotion(root,Boolean(editable),page.id,true);
  useScrollNavigation(header,page.id,open,Boolean(editable));
  const Main=editable?'div':'main';
  const footer=site.footer;
  return <div ref={root} className={styles.layout}>
    <header ref={header} className={styles.header}>
      <ContentLink href="/" editable={editable} className={styles.brand}>{site.name}<span>{site.tagline}</span></ContentLink>
      <button type="button" ref={opener} className={styles.menu} aria-label={open?'Menü schließen':'Menü öffnen'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
      <nav aria-label="Hauptnavigation" className={open?styles.open:''} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);opener.current?.focus();}}}>
        {site.navigation.map(link=><div key={link.href} onClick={()=>setOpen(false)}><ContentLink href={link.href} editable={editable} className={link.href===`/${page.slug}`?styles.current:''}>{link.label}</ContentLink></div>)}
      </nav>
    </header>
    <Main id="hauptinhalt" tabIndex={editable?undefined:-1} className={styles.main}>{children}</Main>
    <footer className={styles.footer}>
      <div><ContentLink href="/" editable={editable} className={styles.footerBrand}>{footer?.brandText||site.name}</ContentLink><p>{site.footerText}</p>{site.email&&<ContentLink href={`mailto:${site.email}`} editable={editable}>{site.email}</ContentLink>}</div>
      {footer?.columns.map(column=><div key={column.id}><h2>{column.title}</h2>{column.links.map(link=><ContentLink key={link.href} href={link.href} editable={editable}>{link.label}</ContentLink>)}</div>)}
      <div className={styles.legal}><span>{footer?.copyright}</span><FooterLegalLinks site={site} editable={editable} /></div>
    </footer>
  </div>;
}
