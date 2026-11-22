"use client";

import {useEffect,useRef} from 'react';
import {consentCopy} from '@/lib/newsletter/model';
import {mountNewsletterSignup} from '@/lib/newsletter/signup';
import '@/lib/newsletter/signup.css';

export function NewsletterSignup({label,groupId,preview=false}:{label:string;groupId?:string;preview?:boolean}){
 const ref=useRef<HTMLFormElement>(null);
 useEffect(()=>ref.current?mountNewsletterSignup(ref.current,{groupId,preview}):undefined,[groupId,preview]);
 return <form className="nl-signup" ref={ref} aria-label="Newsletter-Anmeldung">
  <fieldset disabled>
   <span data-signup-topic/>
   <div className="nl-signup-main">
    <label>E-Mail-Adresse<input name="email" type="email" autoComplete="email" maxLength={254} required/></label>
    <button type="submit">{label||'Anmelden'}</button>
   </div>
   <label className="nl-signup-consent"><input name="consent" type="checkbox" required/><span>{consentCopy} <a href="/datenschutz#newsletter">Datenschutz</a></span></label>
   <label className="nl-signup-hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
  </fieldset>
  <span role="status" aria-live="polite" data-signup-status/>
 </form>;
}
