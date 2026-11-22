'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, ExternalLink, Play, ShoppingBasket, Timer } from 'lucide-react';
import { addDays, daysBetween, today } from '@/lib/coaching-portal/model';
import type { Activity, ClientView, Edition, Language, PlanItem, SetLog } from '@/lib/coaching-portal/model';
import { kindIcons, kinds } from './plan-editor';
import { ActionRow, Button, Empty, Field, Input, Modal, Section, Status, errorText, prettyDate, request, translator } from './ui';
import styles from './portal.module.css';

export function dayEdition(value: ClientView, date: string) {
  return [value.program.published, ...value.program.history].find(entry=>entry&&daysBetween(entry.plan.start,date)>=0&&daysBetween(entry.plan.start,date)<entry.plan.weeks*7)??null;
}
function scheduled(edition: Edition|null,date:string) {
  return edition?.plan.items.filter(item=>item.day===daysBetween(edition.plan.start,date)&&edition.plan.features[item.kind])
    .sort((a,b)=>(a.at||'24:00').localeCompare(b.at||'24:00'))??[];
}
function startWeek(date:string) {
  return addDays(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));
}

export function Media({ href, title, language }: {href:string;title:string;language:Language}) {
  const t=translator(language);
  const [opened,setOpened]=useState(false);
  const [mime,setMime]=useState('');
  useEffect(()=>{
    if(href.startsWith('/api/coaching-portal/file/')){
      const abort=new AbortController();
      void fetch(href,{method:'HEAD',signal:abort.signal,cache:'no-store'}).then(response=>setMime(response.headers.get('content-type')??'')).catch(()=>{});
      return ()=>abort.abort();
    }
  },[href]);
  if(!href)return null;
  if(href.startsWith('/api/coaching-portal/file/')) {
    if(mime.startsWith('video/'))return <video className={styles.video} controls playsInline preload="metadata" src={href} aria-label={title}/>;
    if(mime.startsWith('image/'))return <img className={styles.video} src={href} alt={title}/>;
    return <a className={styles.resource} href={href} target="_blank" rel="noreferrer">{t('Datei öffnen','Open file')} <ExternalLink size={15}/></a>;
  }
  let video='';
  try {
    const url=new URL(href);
    if(['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(url.hostname)){
      const id=url.hostname==='youtu.be'?url.pathname.slice(1):url.searchParams.get('v')??url.pathname.split('/').at(-1);
      if(id&&/^[a-zA-Z0-9_-]{11}$/u.test(id))video='https://www.youtube-nocookie.com/embed/'+id;
    }else if(['vimeo.com','player.vimeo.com'].includes(url.hostname)) {
      const id=url.pathname.split('/').filter(Boolean).find(entry=>/^\d{5,}$/u.test(entry));
      if(id)video='https://player.vimeo.com/video/'+id;
    }
  }catch{ return null; }
  if(!video)return <a className={styles.resource} href={href} target="_blank" rel="noreferrer">{t('Video öffnen','Open video')} <ExternalLink size={15}/></a>;
  return opened?<iframe title={title} className={styles.video} src={video} allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:
    <Button quiet onClick={()=>setOpened(true)}><Play size={16}/>{t('Video beim Anbieter laden','Load video from provider')}</Button>;
}
function RestTimer({ seconds, language }: {seconds:number;language:Language}) {
  const t=translator(language);
  const [end,setEnd]=useState(0),[now,setNow]=useState(0);
  useEffect(()=>{
    if(!end)return;
    const id=window.setInterval(()=>{
      const current=Date.now();
      setNow(current);
      if(current>=end)window.clearInterval(id);
    },250);
    return ()=>window.clearInterval(id);
  },[end]);
  const left=end?Math.max(0,Math.ceil((end-now)/1000)):seconds;
  return <div className={styles.timer}><Timer size={17}/><strong>{Math.floor(left/60)}:{String(left%60).padStart(2,'0')}</strong>
    <Button quiet onClick={()=>{const current=Date.now();setNow(current);setEnd(current+seconds*1000);}}>{left===0?t('Neu starten','Restart'):t('Pause starten','Start rest')}</Button>
    {end>0&&<Button quiet onClick={()=>setEnd(0)}>{t('Zurücksetzen','Reset')}</Button>}</div>;
}
function downloadAppointment(item:PlanItem,date:string) {
  const time=(item.at||'09:00').replace(':','');
  const prefix=date.replaceAll('-','')+'T'+time+'00';
  const title=item.title.replace(/[\\,;\n\r]/gu,' ');
  const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sebastian Coaching//Calendar//DE','BEGIN:VEVENT',
    'UID:'+item.id+'@coaching','DTSTAMP:'+new Date().toISOString().replace(/[-:]/gu,'').replace(/\.\d{3}Z$/u,'Z'),
    'DTSTART;TZID=Europe/Berlin:'+prefix,'DURATION:PT'+(item.minutes||20)+'M','SUMMARY:'+title,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/calendar'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='coaching.ics';anchor.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),500);
}
function ShoppingList({ client,from,language }: { client:ClientView; from:string; language:Language }) {
  const t=translator(language);
  const totals=new Map<string,{name:string;unit:string;amount:number}>();
  for(let offset=0;offset<7;offset++){
    const date=addDays(from,offset);
    for(const item of scheduled(dayEdition(client,date),date)){
      if(item.kind!=='meal'||!item.recipe)continue;
      for(const ingredient of item.recipe.ingredients){
        const key=ingredient.name.trim().toLowerCase()+'|'+ingredient.unit;
        totals.set(key,{...ingredient,amount:(totals.get(key)?.amount??0)+ingredient.amount});
      }
    }
  }
  if(!totals.size)return <Empty title={t('Keine Zutaten für diese Woche','No ingredients for this week')}/>;
  return <div className={styles.stack}>{[...totals].map(([key,ingredient])=><label className={styles.switch} key={key}><span>{ingredient.name} · {Number(ingredient.amount.toFixed(2))} {ingredient.unit}</span><input style={{opacity:1}} type="checkbox"/></label>)}</div>;
}
function ItemView({ item,date,edition,initial,language,onSave,showNutrition }: {
  item:PlanItem; date:string; edition:string; initial?:Activity; language:Language; onSave:(record:Activity)=>void; showNutrition:boolean;
}) {
  const t=translator(language);
  const [sets,setSets]=useState<SetLog[]>(initial?.sets??[]);
  const [short,setShort]=useState(initial?.variant==='short');
  const exercises=short&&item.short?item.short.exercises:item.exercises;
  const [answers,setAnswers]=useState<Activity['answers']>(initial?.answers??{});
  const [note,setNote]=useState(initial?.comment??''),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[issue,setIssue]=useState('');
  const [part,setPart]=useState(item.recipe?.servings??1);
  function edit(exercise:string,set:number,delta:Partial<SetLog>){
    const prior=sets.find(value=>value.exercise===exercise&&value.set===set)??{exercise,set,reps:null,kg:null,done:false};
    setSets([...sets.filter(value=>value.exercise!==exercise||value.set!==set),{...prior,...delta}]);
  }
  async function save(done:boolean) {
    setSaving(true);setIssue('');setMessage('');
    try {
      const record=await request<Activity>('activity',{edition,item:item.id,date,sets,answers,comment:note,done,...(short?{variant:'short'}:{})});
      onSave(record);setMessage(t('Gespeichert','Saved'));
    }catch(error){setIssue(errorText(error));}finally{setSaving(false);}
  }
  return <div className={styles.stack}>
    <span className={styles.label}>{prettyDate(date,language,true)} {item.at&&' · '+item.at} {item.minutes>0&&' · '+item.minutes+' min'}</span>
    {item.text&&<p style={{whiteSpace:'pre-wrap'}}>{item.text}</p>}
    {item.media&&<Media href={item.media} title={item.title} language={language}/>}
    {item.short&&<div className={styles.actions}>
      <Button quiet aria-pressed={!short} onClick={()=>{if(short){setShort(false);setSets([]);}}}>{t('Reguläre Einheit','Regular session')} · {item.minutes} min</Button>
      <Button quiet aria-pressed={short} onClick={()=>{if(!short){setShort(true);setSets([]);}}}>{item.short.title} · {item.short.minutes} min</Button>
    </div>}
    {item.kind==='workout'&&exercises.map(exercise=><div key={exercise.id} className={styles.subcard+' '+styles.stack}>
      <h3>{exercise.name}</h3><p className={styles.copy}>{exercise.sets} {t('Sätze','sets')} · {exercise.reps} {t('Wdh.','reps')} {exercise.targetKg!==null&&' · '+exercise.targetKg+' kg'}</p>
      {exercise.cues&&<p>{exercise.cues}</p>}{exercise.alternative&&<p className={styles.copy}>{t('Alternative','Alternative')} · {exercise.alternative}</p>}
      {exercise.video&&<Media href={exercise.video} title={exercise.name} language={language}/>}
      {Array.from({length:exercise.sets},(_,index)=>{
        const number=index+1, set=sets.find(value=>value.exercise===exercise.id&&value.set===number);
        return <div key={number} className={styles.fields3}>
          <Field label={t('Satz','Set')+' '+number}><input type="checkbox" checked={set?.done??false} onChange={event=>edit(exercise.id,number,{done:event.target.checked})}/></Field>
          <Field label={t('Wiederholungen','Reps')}><Input type="number" min={0} value={set?.reps??''} onChange={event=>edit(exercise.id,number,{reps:event.target.value===''?null:Number(event.target.value)})}/></Field>
          <Field label="kg"><Input type="number" min={0} step=".1" value={set?.kg??''} onChange={event=>edit(exercise.id,number,{kg:event.target.value===''?null:Number(event.target.value)})}/></Field>
        </div>;
      })}
      {exercise.rest>0&&<RestTimer seconds={exercise.rest} language={language}/>}
    </div>)}
    {item.kind==='meal'&&item.recipe&&<div className={styles.stack}>
      <Field label={t('Portionen','Servings')}><Input type="number" min=".25" max="30" step=".25" value={part} onChange={event=>setPart(Math.max(.25,Number(event.target.value)))}/></Field>
      {item.recipe.ingredients.length>0&&<div className={styles.subcard}><h3>{t('Zutaten','Ingredients')}</h3><ul>{item.recipe.ingredients.map((ingredient,index)=><li key={index}>{Number((ingredient.amount*part/item.recipe!.servings).toFixed(2))} {ingredient.unit} {ingredient.name}</li>)}</ul></div>}
      {item.recipe.instructions&&<p style={{whiteSpace:'pre-wrap'}}>{item.recipe.instructions}</p>}
      {item.recipe.alternative&&<p className={styles.copy}>{t('Alternative','Alternative')} · {item.recipe.alternative}</p>}
      {showNutrition&&item.recipe.kcal!==null&&<div className={styles.pills}><span className={styles.badge}>{item.recipe.kcal} kcal / {t('Portion','serving')}</span>
        {item.recipe.protein!==null&&<span className={styles.badge}>{item.recipe.protein} g Protein</span>}</div>}
    </div>}
    {item.kind==='appointment'&&<Button quiet onClick={()=>downloadAppointment(item,date)}><CalendarDays size={17}/>{t('In meinen Kalender übernehmen','Add to my calendar')}</Button>}
    {item.kind==='checkin'&&item.questions.map(question=><Field key={question.id} label={question.label}>
      {question.type==='text'?<textarea value={String(answers[question.id]??'')} onChange={event=>setAnswers({...answers,[question.id]:event.target.value})}/>:
        question.type==='boolean'?<input type="checkbox" checked={answers[question.id]===true} onChange={event=>setAnswers({...answers,[question.id]:event.target.checked})}/>:
        <Input type="number" min={question.type==='rating'?1:undefined} max={question.type==='rating'?5:undefined}
          value={typeof answers[question.id]==='number'?Number(answers[question.id]):''}
          onChange={event=>{const next={...answers};if(event.target.value==='')delete next[question.id];else next[question.id]=Number(event.target.value);setAnswers(next);}}/>}</Field>)}
    {(item.kind==='workout'||item.kind==='checkin'||item.kind==='habit')&&<Field label={t('Deine Notiz','Your note')}><textarea value={note} onChange={event=>setNote(event.target.value)}/></Field>}
    {issue&&<Status bad text={issue}/>} {message&&<Status text={message}/>}
    <div className={styles.actions}>{(item.kind==='workout'||item.kind==='checkin')&&<Button onClick={()=>void save(false)} disabled={saving}>{t('Zwischenstand speichern','Save progress')}</Button>}
      <Button primary loading={saving} onClick={()=>void save(true)}><Check size={17}/>{item.kind==='checkin'?t('Check-in senden','Send check-in'):t('Als erledigt markieren','Mark complete')}</Button></div>
  </div>;
}

export function ClientPlan({ client,language,view,onLog }: { client:ClientView;language:Language;view:'today'|'plan'|'calendar'; onLog:(value:Activity)=>void }) {
  const t=translator(language), now=today();
  const [day,setDay]=useState(now),[item,setItem]=useState<PlanItem|null>(null),[shopping,setShopping]=useState(false);
  const date=view==='today'?now:day, first=startWeek(date);
  const version=dayEdition(client,date);
  const edition=client.program.published;
  const current=scheduled(version,date);
  const completed=current.filter(entry=>client.logs.some(log=>log.item===entry.id&&log.edition===version?.id&&log.done)).length;
  if(!edition)return <Section title={t('Dein Coaching wird vorbereitet','Your coaching is being prepared')}>
    <Empty title={t('Hier erscheint deine persönliche Woche','Your personal week will appear here')} text={t('Sobald dein Coaching-Team sie freigibt, findest du hier Training, Rezepte und Termine.','Your training, recipes and appointments will appear here when your team shares your plan.')}/></Section>;
  return <div className={styles.stack}>
    {view==='today'?<div className={styles.hero}><img src="/media/project/studio-portrait.webp" alt="" aria-hidden="true"/>
      <div className={styles.heroText}><span className={styles.label}>{prettyDate(date,language,true)}</span><h1>{t('Hallo','Hello')} {client.person.name.split(' ')[0]}.</h1>
      {(edition.plan.focus||client.program.profile.goal)&&<p>{edition.plan.focus||client.program.profile.goal}</p>}</div></div>:
      <header className={styles.pageHead}><div><h1>{view==='calendar'?t('Dein Kalender','Your calendar'):t('Dein Plan','Your plan')}</h1><p>{edition.plan.title} · {edition.plan.weeks} {t('Wochen','weeks')}</p></div>
      <div className={styles.actions}><Button quiet onClick={()=>setDay(edition.plan.start)}>{t('Zum Planstart','Jump to plan start')}</Button><Button quiet onClick={()=>setShopping(true)}><ShoppingBasket size={16}/>{t('Einkaufsliste','Shopping list')}</Button></div></header>}
    {view!=='today'&&<Section title={prettyDate(first,language)+' – '+prettyDate(addDays(first,6),language)} action={<div className={styles.actions}>
      <Button quiet aria-label={t('Vorige Woche','Previous week')} onClick={()=>setDay(addDays(day,-7))}><ChevronLeft size={16}/></Button>
      <Button quiet onClick={()=>setDay(now)}>{t('Heute','Today')}</Button>
      <Button quiet aria-label={t('Nächste Woche','Next week')} onClick={()=>setDay(addDays(day,7))}><ChevronRight size={16}/></Button></div>}>
      <div className={styles.week}>{Array.from({length:7},(_,index)=>addDays(first,index)).map(value=>{
        const count=scheduled(dayEdition(client,value),value).length,label=prettyDate(value,language);
        return <button key={value} type="button" aria-pressed={value===day} aria-label={label} onClick={()=>{setItem(null);setDay(value);}}><small>{label.split(/[ .]/u)[0]}</small><b>{value.slice(-2)}</b>{count>0&&<span className={styles.label}>·{count}</span>}</button>;
      })}</div></Section>}
    <Section title={view==='today'?t('Was heute ansteht','On your schedule today'):prettyDate(date,language,true)}
      action={current.length>0?<span className={styles.badge}>{completed} / {current.length} {t('erledigt','complete')}</span>:undefined}>
      <div className={styles.items}>{current.map(entry=>{
        const Icon=kindIcons[entry.kind], saved=client.logs.find(log=>log.item===entry.id&&log.edition===version?.id&&log.done);
        return <ActionRow key={entry.id} title={entry.title} icon={saved?<Check size={20}/>:<Icon size={20}/>}
          sub={[kinds(language)[entry.kind],entry.at,entry.minutes?entry.minutes+' min':''].filter(Boolean).join(' · ')} action={()=>setItem(entry)}/>;
      })}</div>
      {!current.length&&<Empty title={t('Heute ist Platz für deinen Alltag','A clear day in your schedule')} text={t('Im Plan findest du deine nächsten Einheiten und Termine.','Check the plan for upcoming sessions and appointments.')}/>}
    </Section>
    {item&&version&&<Modal title={item.title} close={()=>setItem(null)}><ItemView key={version.id+item.id} item={item} date={date} edition={version.id}
      initial={client.logs.find(log=>log.item===item.id&&log.edition===version.id)} language={language}
      onSave={onLog} showNutrition={version.plan.features.nutrition}/></Modal>}
    {shopping&&<Modal title={t('Einkaufsliste dieser Woche','Shopping list for this week')} close={()=>setShopping(false)}><ShoppingList client={client} from={first} language={language}/></Modal>}
  </div>;
}
