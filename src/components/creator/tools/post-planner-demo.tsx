"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, Check, CheckCheck, ChevronDown, Clock3, FileCheck2, Film, Image as ImageIcon, LoaderCircle, RotateCcw, Send, TriangleAlert } from 'lucide-react';
import type { ContentItem } from '@/lib/types';
import { demoWeek, parseDemoPosts, postPlannerCopy, toolDetail, type DemoPost } from '@/lib/creator/tools';
import { EditableText } from '@/components/site/editable';
import styles from './post-planner.module.css';

type DemoStatus = 'prepared' | 'scheduled' | 'processing' | 'published' | 'needs_review';
type PlannedPost = DemoPost & { status: DemoStatus };

function seedPosts(item: ContentItem): PlannedPost[] {
  return (parseDemoPosts(postPlannerCopy(item)('seed')) ?? []).map(post => ({ ...post, status: post.needsReview ? 'needs_review' : 'prepared' }));
}

export function PostPlannerInfo({ item, editable, onChange }: { item: ContentItem; editable?: boolean; onChange: (item: ContentItem) => void }) {
  const copy = postPlannerCopy(item);
  return <details className={styles.requirements}>
    <summary><EditableText as="span" value={copy('requirementsTitle')} editable={editable} onChange={value => onChange(toolDetail(item, 'requirementsTitle', value))} /><ChevronDown size={17} aria-hidden="true" /></summary>
    <EditableText as="p" value={copy('requirements')} editable={editable} onChange={value => onChange(toolDetail(item, 'requirements', value))} />
  </details>;
}

/** A self-contained public example: no admin, provider, media upload or network calls. */
export function PostPlannerDemo({ item, editable = false }: { item: ContentItem; editable?: boolean }) {
  const copy = postPlannerCopy(item), week = demoWeek(copy('weekStart')), id = useId();
  const [posts, setPosts] = useState(() => seedPosts(item));
  const [selected, setSelected] = useState(() => posts[0]?.id ?? '');
  const [error, setError] = useState('');
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const active = posts.find(post => post.id === selected) ?? posts[0];
  const busy = active?.status === 'processing', done = active?.status === 'published';
  useEffect(() => {
    const pending = timers.current;
    return () => { for (const timer of pending.values()) clearTimeout(timer); pending.clear(); };
  }, []);

  const reset = () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    const next = seedPosts(item);
    setPosts(next); setSelected(next[0]?.id ?? ''); setError('');
  };
  const update = (patch: Partial<PlannedPost>) => {
    if (!active || busy || done) return;
    setPosts(previous => previous.map(post => post.id === active.id ? { ...post, ...patch, status: post.status === 'scheduled' ? 'prepared' : post.status } : post));
    setError('');
  };
  const advance = () => {
    if (!active || busy) return;
    const postId = active.id;
    const status = (value: DemoStatus) => setPosts(previous => previous.map(post => post.id === postId ? { ...post, status: value } : post));
    if (done) { status('prepared'); return; }
    if (active.status === 'needs_review') {
      setPosts(previous => previous.map(post => post.id === postId ? { ...post, needsReview: false, status: 'prepared' } : post));
      return;
    }
    if (!active.caption.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(active.time)) { setError(copy('invalid')); return; }
    if (active.status === 'prepared') { status('scheduled'); return; }
    status('processing');
    if (editable || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { status('published'); return; }
    timers.current.set(postId, setTimeout(() => { status('published'); timers.current.delete(postId); }, 1150));
  };
  const action = !active ? '' : busy ? 'working' : done ? 'editAgain' : active.status === 'needs_review' ? 'fix' : active.status === 'scheduled' ? 'simulate' : 'approve';
  const note = !active ? '' : active.status === 'needs_review' ? 'review' : done ? 'done' : active.status === 'scheduled' ? 'planned' : busy ? 'working' : 'ready';
  const phase = !active ? 0 : ['prepared', 'scheduled', 'processing', 'published'].indexOf(active.status);

  return <div className={styles.planner} data-creator-tool="publishing" data-status={active?.status} data-editable={editable ? 'true' : undefined}>
    <header className={styles.header}>
      <div><h3>{copy('appTitle')}</h3><p><span aria-hidden="true" />{copy('local')}</p></div>
      <button type="button" className={styles.reset} aria-label={copy('reset')} onClick={reset}><RotateCcw size={15} /><span>{copy('reset')}</span></button>
    </header>
    {active ? <>
      <div className={styles.layout}>
        <nav className={styles.queue} aria-label={copy('choosePost')}>
          <h4>{copy('queue')}</h4>
          <ol>{posts.map((post, index) => <li key={post.id}>
            <button type="button" aria-pressed={active.id === post.id} aria-controls={`${id}-editor`} onClick={() => { setSelected(post.id); setError(''); }}>
              <span className={styles.thumb} data-look={index % 3} aria-hidden="true">{post.kind === 'reel' ? <Film size={19} /> : <ImageIcon size={19} />}</span>
              <span className={styles.queueText}><strong>{post.title}</strong><span>{week[post.day].short} {week[post.day].number} · {post.time}</span></span>
              {post.status === 'published' ? <CheckCheck className={styles.queueStatus} size={16} aria-label={copy('published')} /> : post.status === 'needs_review' ? <TriangleAlert className={styles.queueStatus} size={16} aria-label={copy('needs_review')} /> : post.status === 'scheduled' ? <Check className={styles.queueStatus} size={16} aria-label={copy('scheduled')} /> : null}
            </button>
          </li>)}</ol>
          <p className={styles.platform}>Instagram <span>· {copy('week')}</span></p>
        </nav>
        <div id={`${id}-editor`} className={styles.editor}>
          <div className={styles.previewRow}>
            <div className={styles.post} data-look={posts.findIndex(post => post.id === active.id) % 3} role="img" aria-label={`${copy('preview')}: ${active.artwork.replaceAll('\n', ' ')}`}>
              <span>{copy(active.kind)}</span><strong>{active.artwork}</strong><span>{active.kind === 'reel' ? <Film size={18} /> : <ImageIcon size={18} />}<span>Instagram · {copy('week')}</span></span>
            </div>
            <label className={styles.caption} htmlFor={`${id}-caption`}><span>{copy('caption')}</span><textarea id={`${id}-caption`} value={active.caption} maxLength={2200} rows={5} readOnly={busy || done} onChange={event => update({ caption: event.target.value })} /><span className={styles.counter}>{active.caption.length} / 2.200</span></label>
          </div>
          <fieldset className={styles.schedule} disabled={busy || done}>
            <legend>{copy('day')}</legend>
            <div className={styles.week} role="group" aria-label={copy('day')}>{week.map((day, index) => <button type="button" key={day.date} aria-pressed={active.day === index} aria-label={day.full} onClick={() => update({ day: index })}><span>{day.short}</span><strong>{day.number}</strong><i aria-hidden="true" data-mark={posts.some(post => post.day === index) ? 'true' : undefined} /></button>)}</div>
            <div className={styles.scheduleFields}>
              <label className={styles.mobileDay} htmlFor={`${id}-day`}>{copy('day')}<select id={`${id}-day`} value={active.day} onChange={event => update({ day: Number(event.target.value) })}>{week.map((day, index) => <option key={day.date} value={index} aria-label={day.full}>{day.compact}</option>)}</select></label>
              <label className={styles.time} htmlFor={`${id}-time`}><Clock3 size={15} aria-hidden="true" /><span>{copy('time')}</span><input id={`${id}-time`} type="time" value={active.time} onChange={event => update({ time: event.target.value })} /></label>
              <span className={styles.zone}>{copy('zone')}</span>
            </div>
          </fieldset>
        </div>
      </div>
      <div className={styles.delivery}>
        <ol className={styles.stages} aria-label={copy('appTitle')}>{(['prepared', 'scheduled', 'processing', 'published'] as const).map((step, index) => <li key={step} data-current={active.status === step ? 'true' : undefined} data-complete={phase > index ? 'true' : undefined}><span aria-hidden="true">{index < phase ? <Check size={13} /> : step === 'prepared' ? <FileCheck2 size={14} /> : step === 'scheduled' ? <CalendarDays size={14} /> : step === 'processing' ? <Send size={13} /> : <CheckCheck size={14} />}</span><span>{copy(step)}</span></li>)}</ol>
        <div className={styles.actionRow}>
          <div className={styles.statusNote} data-review={active.status === 'needs_review' ? 'true' : undefined}>
            <p className={styles.status} aria-live="polite" aria-atomic="true">{active.status === 'needs_review' ? <TriangleAlert size={16} /> : done ? <CheckCheck size={17} /> : <span className={styles.statusDot} />}<strong>{copy(done ? 'confirmed' : active.status)}</strong></p>
            <p>{copy(note)}</p>
          </div>
          <button type="button" className={styles.primary} aria-disabled={busy || undefined} onClick={advance}>{busy ? <LoaderCircle size={17} className={styles.spinner} /> : done ? <RotateCcw size={17} /> : active.status === 'scheduled' ? <Send size={17} /> : <Check size={18} />}<span>{copy(action)}</span></button>
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    </> : <div className={styles.empty}><CalendarDays size={30} /><p>{copy('empty')}</p></div>}
  </div>;
}
