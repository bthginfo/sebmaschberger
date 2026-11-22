export function mountNewsletterSignup(form:HTMLFormElement,{groupId,preview}:{groupId?:string;preview?:boolean}){
 const controller=new AbortController();
 const status=form.querySelector<HTMLElement>('[data-signup-status]')!;
 const fields=form.querySelector<HTMLFieldSetElement>('fieldset')!;
 const subject=form.querySelector<HTMLElement>('[data-signup-topic]');
 const endpoint='/api/newsletter/subscribe';
 let active=Boolean(preview),busy=false;
 function tell(message:string,error=false){status.textContent=message;status.dataset.error=String(error);}
 if(preview){
  fields.disabled=false;tell('Vorschau · Die Anmeldung bleibt in dieser Ansicht lokal.');
 }else{
  void fetch(endpoint+(groupId?'?group='+encodeURIComponent(groupId):''),{signal:controller.signal,cache:'no-store'}).then(async response=>{
   const data=await response.json() as {enabled?:boolean;group?:string};
   if(controller.signal.aborted)return;
   active=response.ok&&data.enabled===true;
   fields.disabled=!active;
   if(subject&&data.group)subject.textContent=data.group;
   if(!active)tell('Die Newsletter-Anmeldung ist derzeit geschlossen.');
  }).catch(()=>{if(!controller.signal.aborted)tell('Die Anmeldung konnte gerade nicht geladen werden.');});
 }
 function sourcePath(){
  try{return decodeURIComponent(window.location.pathname).slice(0,240).replace(/[^A-Za-z0-9/_äöüÄÖÜß.-]/g,'');}catch{return '/';}
 }
 const submit=async(event:SubmitEvent)=>{
  event.preventDefault();
  if(!active||busy)return;
  if(preview){tell('So geht es weiter. Nach der Anmeldung kommt eine E-Mail mit dem Bestätigungslink.');return;}
  busy=true;
  const data=new FormData(form);
  fields.disabled=true;form.setAttribute('aria-busy','true');
  try{
   const response=await fetch(endpoint,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({
    email:data.get('email'),consent:data.get('consent')==='on',website:data.get('website')||'',source:sourcePath(),...(groupId?{groupId}:{}),
   })});
   if(!response.ok)throw new Error(response.status===429?'Bitte warten Sie einen Moment, bevor Sie die Anmeldung erneut versuchen.':'Die Anmeldung war gerade nicht möglich. Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.');
   form.reset();tell('Danke. Prüfen Sie Ihr Postfach für die Bestätigung.');
  }catch(error){if(!controller.signal.aborted)tell(error instanceof Error?error.message:'Bitte versuchen Sie es erneut.',true);}
  finally{if(!controller.signal.aborted){busy=false;fields.disabled=!active;form.removeAttribute('aria-busy');}}
 };
 form.addEventListener('submit',submit);
 return()=>{controller.abort();form.removeEventListener('submit',submit);};
}
