"use client";

import {useEffect,useRef} from 'react';
import {mountNewsletterShowcase} from '@/lib/workspace/newsletter-showcase';
import '@/lib/workspace/newsletter-showcase.css';

export function NewsletterShowcase({creators=false}:{creators?:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>ref.current?mountNewsletterShowcase(ref.current,creators?'creators':'standard'):undefined,[creators]);
 return <div className="nl-showcase" ref={ref} aria-label="Interaktives Beispiel für Newsletter und Webanalyse"/>;
}
