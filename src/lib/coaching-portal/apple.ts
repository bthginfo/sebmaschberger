import { Unzip, UnzipInflate } from 'fflate';
import { addDays, localDate, metrics, today } from './model';
import type { Metrics } from './model';

function field(attrs: string, key: string) {
  return new RegExp('(?:^|\\s)' + key + '="([^"]*)"').exec(attrs)?.[1] ?? '';
}
const maxXml = 90 * 1024 * 1024;

function readHealthZip(buffer: Uint8Array) {
  let found = false, size = 0;
  const decoder = new TextDecoder(), parts: string[] = [];
  const unzip = new Unzip(file => {
    if (!/(?:^|\/)(?:export|export_cda)\.xml$/iu.test(file.name) || /export_cda\.xml$/iu.test(file.name) || found) return;
    found = true;
    file.ondata = (error, contents, finished) => {
      if (error) throw error;
      size += contents.byteLength;
      if (size > maxXml) throw new Error('Der Apple-Health-Export ist zu groß. Nutze einen kürzeren Export.');
      parts.push(decoder.decode(contents, { stream: !finished }));
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
    const next = Math.min(buffer.length, offset + 64 * 1024);
    unzip.push(buffer.subarray(offset, next), next === buffer.length);
  }
  if (!found) throw new Error('In der ZIP-Datei fehlt die Apple-Health-Datei export.xml.');
  return parts.join('');
}

export async function readAppleHealth(file: File) {
  if (file.size > 30 * 1024 * 1024) throw new Error('Wähle einen Apple-Health-Export bis 30 MB.');
  const content = file.name.toLowerCase().endsWith('.zip') ? readHealthZip(new Uint8Array(await file.arrayBuffer())) : await file.text();
  if (!/<HealthData(?:\s|>)/u.test(content)) throw new Error('Wähle die ZIP- oder XML-Datei aus der Health-App.');
  return appleRows(content);
}

export function appleRows(content: string, end = today()) {
  const from = addDays(end, -89), rows = new Map<string, Metrics>();
  const steps = new Map<string, Map<string, Map<string, number>>>();
  const sleep = new Map<string, [number, number][]>();
  const workouts = new Map<string, Set<string>>();
  const useRow = (date: string) => {
    const entry = rows.get(date) ?? { date };
    rows.set(date, entry);
    return entry;
  };
  for (const match of content.matchAll(/<(Record|Workout)\b([^<>]*)>/gu)) {
    const [, kind, attrs] = match;
    const start = field(attrs, 'startDate'), finish = field(attrs, 'endDate');
    const source = field(attrs, 'sourceName');
    const type = field(attrs, 'type'), value = field(attrs, 'value'), unit = field(attrs, 'unit');
    const key = (type === 'HKCategoryTypeIdentifierSleepAnalysis' ? finish : start).slice(0, 10);
    if (key < from || key > end || !localDate.safeParse(key).success) continue;
    if (kind === 'Workout') {
      const identifiers = workouts.get(key) ?? new Set<string>();
      identifiers.add(start + ':' + finish);
      workouts.set(key, identifiers);
    } else if (type === 'HKQuantityTypeIdentifierStepCount') {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0 || amount > 100000) continue;
      const groups = steps.get(key) ?? new Map<string, Map<string, number>>();
      const values = groups.get(source) ?? new Map<string, number>();
      values.set(start + ':' + finish, Math.max(values.get(start + ':' + finish) ?? 0, amount));
      groups.set(source, values);
      steps.set(key, groups);
    } else if (type === 'HKCategoryTypeIdentifierSleepAnalysis' && value.startsWith('HKCategoryValueSleepAnalysisAsleep')) {
      const a = Date.parse(start), b = Date.parse(finish);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) continue;
      const intervals = sleep.get(key) ?? [];
      intervals.push([a, b]);
      sleep.set(key, intervals);
    } else if (type === 'HKQuantityTypeIdentifierBodyMass') {
      const kg = Number(value) * (unit === 'lb' ? 0.45359237 : unit === 'kg' ? 1 : 0);
      if (kg >= 20 && kg <= 550) useRow(key).weight = Math.round(kg * 10) / 10;
    }
  }
  // Use one daily step source so an iPhone and a watch do not count the same walk twice.
  for (const [date, sources] of steps) {
    const totals = [...sources.values()].map(records => [...records.values()].reduce((sum, count) => sum + count, 0));
    useRow(date).steps = Math.round(Math.min(180000, Math.max(...totals)));
  }
  for (const [date, episodes] of sleep) {
    let total = 0, last = 0;
    for (const [a, b] of episodes.sort((first, second) => first[0] - second[0])) {
      total += Math.max(0, b - Math.max(last, a));
      last = Math.max(last, b);
    }
    useRow(date).sleep = Math.min(1440, Math.round(total / 60000));
  }
  for (const [date, values] of workouts) useRow(date).workouts = Math.min(30, values.size);
  return [...rows.values()].sort((a, b) => b.date.localeCompare(a.date)).filter(value => metrics.safeParse(value).success);
}
