import { z } from 'zod';

export const outcomeKinds = ['contact','partnership','purchase','appointment','offer'] as const;
export const outcomeLabels = { contact:'Kontaktanfragen', partnership:'Kooperationsanfragen', purchase:'Bestätigte Käufe', appointment:'Angenommene Termine', offer:'Angenommene Angebote' } as const;
export const analyticsOutcome = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  kind: z.enum(outcomeKinds),
  at: z.string().datetime()
}).strict();
export type AnalyticsOutcome = z.infer<typeof analyticsOutcome>;
