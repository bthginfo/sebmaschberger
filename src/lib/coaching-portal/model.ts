import { z } from "zod";

export const languages = z.enum(["de", "en"]);
export const roles = z.enum(["coach", "client"]);
export const providers = z.enum(["google", "oura", "withings"]);
export const healthSources = z.enum(["manual", "apple", "google", "oura", "withings"]);
export const sections = z.enum(["workout", "meal", "resource", "appointment", "checkin", "habit"]);
export const accountId = z.string().regex(/^[a-f0-9]{64}$/u);
export const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine(value => {
  const parsed = new Date(value + "T12:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Wähle ein gültiges Datum.");
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u);
const label = z.string().trim().min(1).max(140);
const note = z.string().trim().max(4000);
const uuid = z.uuid();
const assetPath = z.string().regex(/^\/api\/coaching-portal\/file\/[a-f0-9-]{36}$/iu);
const approvedVideo = z.string().url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password &&
    ["www.youtube.com", "youtube.com", "youtu.be", "www.youtube-nocookie.com", "vimeo.com", "player.vimeo.com"].includes(url.hostname);
}, "Verwende einen freigegebenen YouTube- oder Vimeo-Link.");
export const mediaReference = z.union([z.literal(""), assetPath, approvedVideo]);
const ingredient = z.object({ name: label, amount: z.number().positive().max(100_000), unit: z.string().trim().max(20) }).strict();
export const exercise = z.object({
  id: uuid, name: label, sets: z.number().int().min(1).max(20), reps: z.string().trim().max(24),
  rest: z.number().int().min(0).max(900), targetKg: z.number().min(0).max(1500).nullable(),
  cues: note, alternative: z.string().trim().max(160), video: mediaReference
}).strict();
export const recipe = z.object({
  servings: z.number().min(0.25).max(100), ingredients: z.array(ingredient).max(60),
  instructions: note, alternative: z.string().trim().max(200),
  kcal: z.number().min(0).max(10_000).nullable(), protein: z.number().min(0).max(1000).nullable(),
  carbs: z.number().min(0).max(1000).nullable(), fat: z.number().min(0).max(1000).nullable()
}).strict();
export const question = z.object({ id: uuid, label, type: z.enum(["text", "number", "rating", "boolean"]) }).strict();
export const planItem = z.object({
  id: uuid, day: z.number().int().min(0).max(83), kind: sections, title: label, text: note,
  at: z.union([z.literal(""), clock]), minutes: z.number().int().min(0).max(480), media: mediaReference,
  exercises: z.array(exercise).max(30), short: z.object({ title: label, minutes: z.number().int().min(1).max(480), exercises: z.array(exercise).min(1).max(30) }).strict().optional(),
  recipe: recipe.nullable(), questions: z.array(question).max(20)
}).strict();
export const plan = z.object({
  title: label, focus: z.string().trim().max(260), start: localDate, weeks: z.number().int().min(1).max(12),
  features: z.object({
    workout: z.boolean(), meal: z.boolean(), resource: z.boolean(), appointment: z.boolean(),
    checkin: z.boolean(), habit: z.boolean(), tracking: z.boolean(), chat: z.boolean(), nutrition: z.boolean()
  }).strict(),
  items: z.array(planItem).max(450)
}).strict().superRefine((value, context) => {
  if (value.items.some(item => item.day >= value.weeks * 7)) context.addIssue({ code: "custom", path: ["weeks"], message: "Mindestens ein Eintrag liegt hinter dem Planende." });
  if (new Set(value.items.map(item => item.id)).size !== value.items.length) context.addIssue({ code: "custom", path: ["items"], message: "Plane jeden Eintrag mit einer eigenen Kennung." });
});
export const profile = z.object({
  goal: z.string().trim().max(400), routine: z.string().trim().max(500), equipment: z.string().trim().max(500),
  preferences: z.string().trim().max(500), note: z.string().trim().max(5000), steps: z.number().int().min(0).max(60_000).nullable()
}).strict();
export const enrolment = z.object({ name: label, email: z.email().max(254).transform(v => v.toLowerCase()), language: languages, role: roles, send: z.boolean().default(false) }).strict();
export const metrics = z.object({
  date: localDate, steps: z.number().int().min(0).max(180_000).optional(),
  sleep: z.number().int().min(0).max(1440).optional(), active: z.number().int().min(0).max(1440).optional(),
  workouts: z.number().int().min(0).max(30).optional(), weight: z.number().min(20).max(550).optional()
}).strict().refine(v => Object.keys(v).length > 1, "Gib mindestens einen Wert an.");
export const setLog = z.object({ exercise: uuid, set: z.number().int().min(1).max(20), reps: z.number().int().min(0).max(500).nullable(), kg: z.number().min(0).max(1500).nullable(), done: z.boolean() }).strict();
export const logInput = z.object({
  edition: uuid, item: uuid, date: localDate, done: z.boolean(), variant: z.literal('short').optional(), sets: z.array(setLog).max(600),
  answers: z.record(uuid, z.union([z.string().max(1500), z.number().finite(), z.boolean()])).refine(v => Object.keys(v).length <= 20),
  comment: z.string().trim().max(1200)
}).strict();

export type Language = z.infer<typeof languages>;
export type PortalRole = z.infer<typeof roles>;
export type Provider = z.infer<typeof providers>;
export type HealthSource = z.infer<typeof healthSources>;
export type SectionKind = z.infer<typeof sections>;
export type Exercise = z.infer<typeof exercise>;
export type Recipe = z.infer<typeof recipe>;
export type Question = z.infer<typeof question>;
export type PlanItem = z.infer<typeof planItem>;
export type Plan = z.infer<typeof plan>;
export type Profile = z.infer<typeof profile>;
export type Metrics = z.infer<typeof metrics>;
export type SetLog = z.infer<typeof setLog>;
export type Activity = z.infer<typeof logInput> & { id: string; title: string; kind: SectionKind; updated: string };
export type MetricRow = Metrics & { source: HealthSource };
export type Access = { id: string; name: string; email: string; role: PortalRole; language: Language; status: "invited" | "active" | "paused"; coaches: string[]; created: string };
export type Edition = { id: string; at: string; plan: Plan; profile?: Profile };
export type Program = { revision: number; draft: Plan; published: Edition | null; history: Edition[]; profile: Profile };
export type ChatMessage = { id: string; who: "team" | "client"; text: string; at: string; sender?: string; media?: string };
export type LibraryItem = { id: string; owner: string; kind: "item" | "plan"; title: string; created: string; item?: PlanItem; plan?: Plan };
export type DeviceState = { provider: Provider; available: boolean; connected: boolean; lastSync: string | null };
export type Audit = { id: string; at: string; actor: string; title: string };
export type ActorView = { id: string; name: string; role: "owner" | PortalRole; language: Language };
export type ClientView = {
  person: Access; program: Program; logs: Activity[]; metrics: MetricRow[]; messages: ChatMessage[];
  devices: DeviceState[]; sharing: boolean; audit: Audit[];
};
export type PortalSnapshot = {
  actor: ActorView; directory: Access[]; coaches: Access[]; library: LibraryItem[]; client: ClientView | null;
};

export const emptyRecipe: Recipe = { servings: 2, ingredients: [], instructions: "", alternative: "", kcal: null, protein: null, carbs: null, fat: null };
export const emptyProfile: Profile = { goal: "", routine: "", equipment: "", preferences: "", note: "", steps: null };
export function today(timeZone = "Europe/Berlin") {
  return new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function addDays(date: string, days: number) {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function daysBetween(first: string, second: string) {
  return Math.round((Date.parse(second + "T12:00:00Z") - Date.parse(first + "T12:00:00Z")) / 86400000);
}
export function emptyPlan(start = today()): Plan {
  return { title: "Mein Coaching", focus: "", start, weeks: 1,
    features: { workout: true, meal: true, resource: true, appointment: true, checkin: true, habit: true, tracking: true, chat: true, nutrition: false }, items: [] };
}
export const isEnabled = (item: PlanItem, value: Plan) => value.features[item.kind];
export function visiblePlan(value: Plan): Plan {
  return { ...value, items: value.items.filter(item => isEnabled(item, value)).map(item => item.recipe && !value.features.nutrition
    ? { ...item, recipe: { ...item.recipe, kcal: null, protein: null, carbs: null, fat: null } } : item) };
}
