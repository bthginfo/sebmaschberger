'use client';

import { useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Copy, Dumbbell, Eye, FileText, Flag, Layers, Plus, Save, Trash2, Utensils, Move } from 'lucide-react';
import { addDays, emptyRecipe, today } from '@/lib/coaching-portal/model';
import type { Exercise, Language, LibraryItem, Plan, PlanItem, Profile, Question, Recipe, SectionKind } from '@/lib/coaching-portal/model';
import { Button, Empty, Field, Input, Modal, Panel, Section, Switch, errorText, prettyDate, request, translator, uid } from './ui';
import styles from './portal.module.css';

export const kindIcons = { workout: Dumbbell, meal: Utensils, resource: FileText, appointment: CalendarDays, checkin: ClipboardList, habit: Flag };
export function kinds(language: Language): Record<SectionKind, string> {
  const t=translator(language);
  return { workout:t('Training','Workout'), meal:t('Mahlzeit','Meal'), resource:t('Inhalt','Resource'), appointment:t('Termin','Appointment'), checkin:t('Check-in','Check-in'), habit:t('Routine','Habit') };
}
export function features(language: Language): Record<keyof Plan['features'], string> {
  const t=translator(language);
  return { ...kinds(language), tracking:t('Fortschritt & Geräte','Progress & devices'), chat:t('Chat','Chat'), nutrition:t('Nährwerte im Essensplan','Nutrition values') };
}
export function newExercise(): Exercise {
  return { id:uid(), name:'', sets:3, reps:'8–12', rest:75, targetKg:null, cues:'', alternative:'', video:'' };
}
export function newItem(kind: SectionKind, day: number): PlanItem {
  return { id:uid(), day, kind, title:'', text:'', at:'', minutes:kind==='workout'?30:kind==='appointment'?20:0,
    media:'', exercises:kind==='workout'?[newExercise()]:[], recipe:kind==='meal'?structuredClone(emptyRecipe):null,
    questions:kind==='checkin'?[{id:uid(),label:'',type:'text'}]:[] };
}
function duplicate(item: PlanItem, day: number): PlanItem {
  return { ...structuredClone(item), id:uid(), day, exercises:item.exercises.map(entry=>({...entry,id:uid()})), questions:item.questions.map(entry=>({...entry,id:uid()})),...(item.short?{short:{...item.short,exercises:item.short.exercises.map(entry=>({...entry,id:uid()}))}}:{}) };
}
function optionalNumber(value: string) { return value === '' ? null : Number(value); }

function MediaPicker({ value, change, client, label, language }: { value:string; change:(value:string)=>void; client:string; label:string; language:Language }) {
  const t=translator(language);
  const [busy,setBusy]=useState(false),[issue,setIssue]=useState(''),[libraryCopy,setLibraryCopy]=useState(false);
  async function upload(file: File) {
    setBusy(true);setIssue('');
    try {
      const data=new FormData();
      data.append('file',file);
      if(!libraryCopy)data.append('client',client);
      const result=await request<{href:string}>('upload',data);
      change(result.href);
    } catch (error) { setIssue(errorText(error)); } finally { setBusy(false); }
  }
  return <div className={styles.stack}>
    <Field label={label}><Input value={value} onChange={event=>change(event.target.value)} placeholder="https://…"/></Field>
    <label className={styles.copy}><input type="checkbox" checked={libraryCopy} onChange={event=>setLibraryCopy(event.target.checked)}/> {t('Datei für weitere Coaching-Pläne verwenden','Allow reuse in other coaching plans')}</label>
    <Field label={t('Private Datei bis 4 MB','Private file up to 4 MB')}><Input disabled={busy} type="file" accept="video/mp4,application/pdf,image/jpeg,image/png,image/webp" onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);}}/></Field>
    {issue&&<small role="alert">{issue}</small>}
  </div>;
}

function ExerciseFields({ value, change, remove, client, language }: {
  value:Exercise; change:(value:Exercise)=>void; remove:()=>void; client:string; language:Language;
}) {
  const t=translator(language);
  return <div className={styles.subcard+' '+styles.form}>
    <Field label={t('Übung','Exercise')}><Input required value={value.name} onChange={event=>change({...value,name:event.target.value})} placeholder={t('Zum Beispiel Kniebeuge','For example squat')}/></Field>
    <div className={styles.fields3}>
      <Field label={t('Sätze','Sets')}><Input type="number" min={1} max={20} value={value.sets} onChange={event=>change({...value,sets:Number(event.target.value)})}/></Field>
      <Field label={t('Wiederholungen','Reps')}><Input value={value.reps} onChange={event=>change({...value,reps:event.target.value})}/></Field>
      <Field label={t('Pause in Sekunden','Rest in seconds')}><Input type="number" min={0} max={900} value={value.rest} onChange={event=>change({...value,rest:Number(event.target.value)})}/></Field>
    </div>
    <Field label={t('Richtwert in kg','Suggested kg')}><Input type="number" step=".1" min={0} value={value.targetKg??''} onChange={event=>change({...value,targetKg:optionalNumber(event.target.value)})}/></Field>
    <Field label={t('Ausführung','Technique cues')}><textarea value={value.cues} onChange={event=>change({...value,cues:event.target.value})}/></Field>
    <Field label={t('Alternative','Alternative')}><Input value={value.alternative} onChange={event=>change({...value,alternative:event.target.value})}/></Field>
    <MediaPicker label={t('Übungsvideo','Exercise video')} value={value.video} change={video=>change({...value,video})} client={client} language={language}/>
    <div className={styles.actions}><Button quiet onClick={remove}><Trash2 size={15}/>{t('Übung entfernen','Remove exercise')}</Button></div>
  </div>;
}

function RecipeFields({ value, change, language }: { value:Recipe; change:(value:Recipe)=>void; language:Language }) {
  const t=translator(language);
  return <div className={styles.form}>
    <div className={styles.fields}>
      <Field label={t('Portionen','Servings')}><Input type="number" min=".25" step=".25" value={value.servings} onChange={event=>change({...value,servings:Number(event.target.value)})}/></Field>
      <Field label={t('Schnelle Alternative','Quick alternative')}><Input value={value.alternative} onChange={event=>change({...value,alternative:event.target.value})}/></Field>
    </div>
    {value.ingredients.map((i,index)=><div className={styles.subcard+' '+styles.form} key={index}>
      <div className={styles.fields3}>
      {(['name','amount','unit'] as const).map((key,j)=><Field key={key} label={[t('Zutat','Ingredient'),t('Menge','Amount'),t('Einheit','Unit')][j]}><Input value={i[key]} type={key==='amount'?'number':'text'} step={key==='amount'?'any':undefined} onChange={event=>{
        const val=event.target.value;
        change({...value,ingredients:value.ingredients.map((ingredient,n)=>n===index?{...ingredient,[key]:key==='amount'?Number(val):val}:ingredient)});
      }}/></Field>)}
      </div><Button quiet onClick={()=>change({...value,ingredients:value.ingredients.filter((_,n)=>n!==index)})}><Trash2 size={14}/>{t('Zutat entfernen','Remove ingredient')}</Button>
    </div>)}
    <Button quiet onClick={()=>change({...value,ingredients:[...value.ingredients,{name:'',amount:100,unit:'g'}]})}><Plus size={15}/>{t('Zutat ergänzen','Add ingredient')}</Button>
    <Field label={t('Zubereitung','Method')}><textarea value={value.instructions} onChange={event=>change({...value,instructions:event.target.value})}/></Field>
    <div className={styles.fields}>
      {(['kcal','protein','carbs','fat'] as const).map((key,index)=><Field key={key} label={[t('kcal pro Portion','kcal per serving'),t('Protein pro Portion (g)','Protein per serving (g)'),t('Kohlenhydrate (g)','Carbohydrate (g)'),t('Fett (g)','Fat (g)')][index]}><Input type="number" min={0} step=".1" value={value[key]??''} onChange={event=>change({...value,[key]:optionalNumber(event.target.value)})}/></Field>)}
    </div>
  </div>;
}

function ItemFields({ item, change, remove, copy, saveTemplate, client, language, maxDays }: {
  item:PlanItem; change:(item:PlanItem)=>void; remove:()=>void; copy:()=>void; saveTemplate:()=>void; client:string; language:Language; maxDays:number;
}) {
  const t=translator(language), Icon=kindIcons[item.kind];
  const [open,setOpen]=useState(!item.title);
  return <details className={styles.editorItem} open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary><span className={styles.controls}><Icon size={17}/>{item.title||kinds(language)[item.kind]}</span><ChevronDown size={16}/></summary>
    <div className={styles.form}>
      <button type="button" className={styles.drag} draggable aria-label={t('Eintrag auf einen Tag ziehen','Drag item to a day')}
        onDragStart={event=>{event.dataTransfer.setData('application/x-coaching-day',item.id);event.dataTransfer.effectAllowed='move';}}><Move size={16}/> {t('Auf einen Tag ziehen','Drag to a day')}</button>
      <Field label={t('Titel','Title')}><Input value={item.title} onChange={event=>change({...item,title:event.target.value})}/></Field>
      <div className={styles.fields3}>
        <Field label={t('Tag im Plan','Day in plan')}><Input type="number" min={1} max={maxDays} value={item.day+1} onChange={event=>change({...item,day:Math.min(maxDays-1,Math.max(0,Number(event.target.value)-1))})}/></Field>
        <Field label={t('Uhrzeit','Time')}><Input type="time" value={item.at} onChange={event=>change({...item,at:event.target.value})}/></Field>
        <Field label={t('Minuten','Minutes')}><Input type="number" min={0} max={480} value={item.minutes} onChange={event=>change({...item,minutes:Number(event.target.value)})}/></Field>
      </div>
      <Field label={t('Hinweis für den Kunden','Note for the client')}><textarea value={item.text} onChange={event=>change({...item,text:event.target.value})}/></Field>
      {item.kind==='workout'&&<>
        {item.exercises.map(exercise=><ExerciseFields key={exercise.id} value={exercise} client={client} language={language}
          change={entry=>change({...item,exercises:item.exercises.map(value=>value.id===entry.id?entry:value)})}
          remove={()=>change({...item,exercises:item.exercises.filter(value=>value.id!==exercise.id)})}/>)}
        <Button quiet onClick={()=>change({...item,exercises:[...item.exercises,newExercise()]})}><Plus size={15}/>{t('Übung hinzufügen','Add exercise')}</Button>
        <Switch label={t('Kurzversion für volle Tage anbieten','Offer a short version for busy days')} checked={Boolean(item.short)}
          change={enabled=>change({...item,short:enabled?{title:t('Kurze Einheit','Short session'),minutes:15,exercises:[newExercise()]}:undefined})}/>
        {item.short&&<div className={styles.subcard+' '+styles.form}>
          <h3>{t('Kurzversion','Short version')}</h3>
          <div className={styles.fields}><Field label={t('Titel der Kurzversion','Short version title')}><Input value={item.short.title} onChange={event=>change({...item,short:{...item.short!,title:event.target.value}})}/></Field>
          <Field label={t('Minuten der Kurzversion','Short version minutes')}><Input min={1} type="number" value={item.short.minutes} onChange={event=>change({...item,short:{...item.short!,minutes:Number(event.target.value)}})}/></Field></div>
          {item.short.exercises.map(exercise=><ExerciseFields key={exercise.id} value={exercise} client={client} language={language}
            change={value=>change({...item,short:{...item.short!,exercises:item.short!.exercises.map(entry=>entry.id===value.id?value:entry)}})}
            remove={()=>change({...item,short:{...item.short!,exercises:item.short!.exercises.filter(entry=>entry.id!==exercise.id)}})}/>)}
          <Button quiet onClick={()=>change({...item,short:{...item.short!,exercises:[...item.short!.exercises,newExercise()]}})}><Plus size={15}/>{t('Übung zur Kurzversion','Add short-version exercise')}</Button>
        </div>}
      </>}
      {item.kind==='meal'&&item.recipe&&<RecipeFields value={item.recipe} change={recipe=>change({...item,recipe})} language={language}/>}
      {item.kind==='checkin'&&<>
        {item.questions.map(question=><div key={question.id} className={styles.subcard+' '+styles.form}>
          <div className={styles.fields}><Field label={t('Frage','Question')}><Input value={question.label} onChange={event=>change({...item,questions:item.questions.map(v=>v.id===question.id?{...v,label:event.target.value}:v)})}/></Field>
          <Field label={t('Antworttyp','Answer type')}><select value={question.type} onChange={event=>change({...item,questions:item.questions.map(v=>v.id===question.id?{...v,type:event.target.value as Question['type']}:v)})}>
            <option value="text">{t('Freitext','Text')}</option><option value="rating">{t('Skala 1 bis 5','Scale 1 to 5')}</option><option value="number">{t('Zahl','Number')}</option><option value="boolean">{t('Ja oder nein','Yes or no')}</option>
          </select></Field></div>
          <Button quiet onClick={()=>change({...item,questions:item.questions.filter(v=>v.id!==question.id)})}><Trash2 size={15}/>{t('Frage entfernen','Remove question')}</Button>
        </div>)}
        <Button quiet onClick={()=>change({...item,questions:[...item.questions,{id:uid(),label:'',type:'text'}]})}><Plus size={15}/>{t('Frage hinzufügen','Add question')}</Button>
      </>}
      {(item.kind==='workout'||item.kind==='meal'||item.kind==='resource')&&<MediaPicker label={t('Optionaler Video-Link','Optional video link')} value={item.media} change={media=>change({...item,media})} client={client} language={language}/>}
      <div className={styles.actions}><Button quiet onClick={copy}><Copy size={14}/>{t('Duplizieren','Duplicate')}</Button>
        <Button quiet onClick={saveTemplate}><Layers size={14}/>{t('Vorlage speichern','Save as template')}</Button>
        <Button quiet onClick={remove}><Trash2 size={14}/>{t('Entfernen','Remove')}</Button></div>
    </div>
  </details>;
}

export function PlanEditor({ draft, change, profile, changeProfile, library, saveLibrary, savePlan, busy, client, language, published }: {
  draft:Plan; change:(draft:Plan)=>void; profile:Profile; changeProfile:(profile:Profile)=>void;
  library:LibraryItem[]; saveLibrary:(item:Pick<LibraryItem,'id'|'kind'|'title'|'item'|'plan'>)=>void;
  savePlan:(publish:boolean)=>Promise<void>; busy:boolean; client:{id:string;name:string}; language:Language; published:boolean;
}) {
  const t=translator(language), labels=kinds(language);
  const [day,setDay]=useState(0),[page,setPage]=useState<'schedule'|'rules'>('schedule');
  const [checkPublish,setCheckPublish]=useState(false),[publishIssue,setPublishIssue]=useState('');
  const chosen=Math.min(day,draft.weeks*7-1), first=Math.floor(chosen/7)*7;
  const date=addDays(draft.start||today(),chosen), items=draft.items.filter(item=>item.day===chosen);
  const planTemplates=library.filter(entry=>entry.kind==='plan'), libraryItems=library.filter(entry=>entry.kind==='item');
  function add(kind:SectionKind) { change({...draft,items:[...draft.items,newItem(kind,chosen)]}); }
  function copyWeek() {
    if(draft.weeks>=12)return;
    const last=draft.weeks*7;
    change({...draft,weeks:draft.weeks+1,items:[...draft.items,...draft.items.filter(item=>item.day>=first&&item.day<first+7).map(item=>duplicate(item,last+item.day-first))]});
    setDay(last);
  }
  const preview=items.filter(item=>draft.features[item.kind]);
  return <div className={styles.stack}>
    <header className={styles.pageHead}><div><span className={styles.label}>{client.name}</span><h1>{t('Planeditor','Plan editor')}</h1>
      <p>{published?t('Du bearbeitest einen Entwurf. Mit der Freigabe wird die neue Fassung sichtbar.','You are editing a draft. Publish to show the new version.'):t('Baue die erste Woche und prüfe sie in der Kundenvorschau.','Build the first week and review it in the client preview.')}</p></div>
      <div className={styles.actions}><Button loading={busy} onClick={()=>void savePlan(false)}><Save size={17}/>{t('Entwurf speichern','Save draft')}</Button>
      <Button primary disabled={busy} onClick={()=>{setPublishIssue('');setCheckPublish(true);}}><Check size={17}/>{t('Freigeben','Publish')}</Button></div></header>
    <div className={styles.editorTabs}><Button quiet aria-pressed={page==='schedule'} onClick={()=>setPage('schedule')}><CalendarDays size={16}/>{t('Wochenplan','Weekly schedule')}</Button>
      <Button quiet aria-pressed={page==='rules'} onClick={()=>setPage('rules')}><Eye size={16}/>{t('Profil & Sichtbarkeit','Profile & visibility')}</Button></div>
    {page==='rules'?<div className={styles.grid}>
      <Section title={t('Individuelles Profil','Individual profile')}><div className={styles.form}>
        {(['goal','routine','equipment','preferences','note'] as const).map((key,index)=><Field key={key} label={[t('Ziel','Goal'),t('Alltag und Zeitfenster','Routine and available time'),t('Verfügbare Geräte','Available equipment'),t('Ernährung und Vorlieben','Nutrition and preferences'),t('Interne Notiz','Internal note')][index]}>
          <textarea value={profile[key]} onChange={event=>changeProfile({...profile,[key]:event.target.value})}/></Field>)}
        <Field label={t('Optionales Schrittziel','Optional steps goal')}><Input type="number" min={0} max={60000} value={profile.steps??''} onChange={event=>changeProfile({...profile,steps:optionalNumber(event.target.value)})}/></Field>
      </div></Section>
      <Section title={t('Sichtbarkeit für diesen Kunden','Visibility for this client')}>
        {Object.entries(features(language)).map(([key,label])=><Switch key={key} label={label} checked={draft.features[key as keyof Plan['features']]} change={enabled=>change({...draft,features:{...draft.features,[key]:enabled}})}/>)}
      </Section>
    </div>:<div className={styles.editor}>
      <Section title={t('Bibliothek','Library')}>
        <div className={styles.stack}>
          <Button quiet onClick={()=>saveLibrary({id:uid(),kind:'plan',title:draft.title,plan:draft})}><Save size={15}/>{t('Plan als Vorlage sichern','Save plan as template')}</Button>
          {planTemplates.length>0&&<Field label={t('Gesamten Plan übernehmen','Apply whole plan')}><select defaultValue="" onChange={event=>{
            const template=planTemplates.find(entry=>entry.id===event.target.value)?.plan;
            if(template&&window.confirm(t('Diesen Entwurf durch die ausgewählte Vorlage ersetzen?','Replace this draft with the selected template?'))){
              change({...template,start:draft.start,items:template.items.map(item=>duplicate(item,item.day))});setDay(0);
            }
            event.target.value='';
          }}><option value="">{t('Vorlage auswählen','Choose a template')}</option>{planTemplates.map(entry=><option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></Field>}
          {libraryItems.map(entry=><Button key={entry.id} quiet onClick={()=>entry.item&&change({...draft,items:[...draft.items,duplicate(entry.item,chosen)]})}><Plus size={14}/>{entry.title}</Button>)}
        </div>
      </Section>
      <Section title={t('Plan gestalten','Build the plan')}>
        <div className={styles.form}>
          <Field label={t('Planname','Plan name')}><Input value={draft.title} onChange={event=>change({...draft,title:event.target.value})}/></Field>
          <Field label={t('Persönlicher Fokus','Personal focus')}><Input value={draft.focus} onChange={event=>change({...draft,focus:event.target.value})} placeholder={t('Was soll diese Woche gut klappen?','What matters most this week?')}/></Field>
          <div className={styles.fields}><Field label={t('Startdatum','Start date')}><Input type="date" value={draft.start} onChange={event=>change({...draft,start:event.target.value})}/></Field>
          <Field label={t('Wochen','Weeks')}><Input type="number" min={1} max={12} value={draft.weeks} onChange={event=>change({...draft,weeks:Math.min(12,Math.max(1,Number(event.target.value)))})}/></Field></div>
        </div>
        <div className={styles.panelHeading} style={{marginTop:18}}>
          <div className={styles.controls}><Button quiet aria-label={t('Vorige Woche','Previous week')} disabled={first===0} onClick={()=>setDay(first-7)}><ChevronLeft size={17}/></Button>
          <strong>{t('Woche','Week')} {Math.floor(first/7)+1} / {draft.weeks}</strong>
          <Button quiet aria-label={t('Nächste Woche','Next week')} disabled={first+7>=draft.weeks*7} onClick={()=>setDay(first+7)}><ChevronRight size={17}/></Button></div>
          <Button quiet disabled={draft.weeks>=12} onClick={copyWeek}><Copy size={15}/>{t('Woche duplizieren','Duplicate week')}</Button>
        </div>
        <div className={styles.week}>{Array.from({length:7},(_,i)=>{
          const offset=first+i, label=prettyDate(addDays(draft.start||today(),offset),language);
          return <button key={offset} type="button" aria-pressed={offset===chosen} aria-label={label} onClick={()=>setDay(offset)}
            onDragOver={event=>{if(event.dataTransfer.types.includes('application/x-coaching-day'))event.preventDefault();}}
            onDrop={event=>{event.preventDefault();const id=event.dataTransfer.getData('application/x-coaching-day');if(!id)return;
              change({...draft,items:draft.items.map(item=>item.id===id?{...item,day:offset}:item)});setDay(offset);}}>
            <small>{label.split(/[ .]/u)[0]}</small><b>{addDays(draft.start||today(),offset).slice(-2)}</b></button>;
        })}</div>
        <div className={styles.editorTabs}>{Object.entries(labels).map(([key,label])=>{const kind=key as SectionKind, Icon=kindIcons[kind];return <Button key={kind} quiet onClick={()=>add(kind)}><Icon size={15}/>{label} +</Button>;})}</div>
        <div className={styles.items}>{items.map(item=><ItemFields key={item.id} item={item} change={value=>change({...draft,items:draft.items.map(v=>v.id===item.id?value:v)})}
          remove={()=>change({...draft,items:draft.items.filter(v=>v.id!==item.id)})}
          copy={()=>change({...draft,items:[...draft.items,duplicate(item,chosen)]})}
          saveTemplate={()=>saveLibrary({id:uid(),kind:'item',title:item.title,item})}
          client={client.id} language={language} maxDays={draft.weeks*7}/>)}</div>
        {!items.length&&<Empty title={t('Dieser Tag ist frei','A clear day')} text={t('Wähle oben eine Aktivität oder füge eine Vorlage ein.','Choose an activity above or add a template.')}/>}
      </Section>
      <Panel className={styles.preview}><header className={styles.panelHeading}><h2>{t('Kundenvorschau','Client preview')}</h2><Eye size={18}/></header>
        <div className={styles.stack}><span className={styles.label}>{prettyDate(date,language,true)}</span><h3>{draft.title}</h3>
        {draft.focus&&<p className={styles.copy}>{draft.focus}</p>}
        {preview.map(item=><div className={styles.subcard} key={item.id}><small className={styles.label}>{labels[item.kind]} {item.at}</small><strong style={{display:'block'}}>{item.title||labels[item.kind]}</strong>{item.minutes>0&&<small>{item.minutes} min</small>}</div>)}
        {!preview.length&&<Empty title={t('Für diesen Tag ist nichts sichtbar','Nothing is visible on this day')}/>}</div>
      </Panel>
    </div>}
    {checkPublish&&<Modal title={t('Plan freigeben','Publish plan')} close={()=>setCheckPublish(false)}>
      <div className={styles.stack}><p>{client.name} · {draft.title} · {draft.start} · {draft.weeks} {t('Wochen','weeks')}</p>
      <p className={styles.copy}>{t('Der Kunde sieht die freigegebenen Inhalte seiner neuen Woche.','Your client will see the released content of their new week.')}</p>
      {publishIssue&&<p role="alert" className={styles.alert}>{publishIssue}</p>}
      <div className={styles.actionsRight}><Button quiet onClick={()=>setCheckPublish(false)}>{t('Zurück','Back')}</Button><Button primary loading={busy} onClick={()=>{void savePlan(true).then(()=>setCheckPublish(false)).catch(error=>setPublishIssue(errorText(error)));}}>{t('Für Kunden freigeben','Publish to client')}</Button></div></div>
    </Modal>}
  </div>;
}
