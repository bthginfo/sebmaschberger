import { z } from "zod";
import { maxConsentScripts, scriptCategories, scriptContexts, scriptKinds, secureScriptUrl } from "./model";

const bannerCopy = { title: z.string().max(500), text: z.string().max(30000) };
const consentScript = z.object({
  id: z.string().min(1).max(150),
  name: z.string().trim().max(120),
  enabled: z.boolean(),
  category: z.enum(scriptCategories),
  context: z.enum(scriptContexts),
  kind: z.enum(scriptKinds),
  source: z.string().max(20000),
}).strict().superRefine((script, context) => {
  if (script.enabled && !script.name) {
    context.addIssue({ code: "custom", path: ["name"], message: "Aktive Skripte benötigen einen Namen." });
  }
  if (script.kind === "url" && (script.source.length > 2000 || ((script.enabled || script.source.trim()) && !secureScriptUrl(script.source.trim())))) {
    context.addIssue({ code: "custom", path: ["source"], message: "Geben Sie eine vollständige HTTPS-Skriptadresse ein." });
  }
  if (script.kind === "inline" && script.enabled && !script.source.trim()) {
    context.addIssue({ code: "custom", path: ["source"], message: "Geben Sie den JavaScript-Code für das aktive Skript ein." });
  }
});

export const consentConfigSchema = z.object({
  enabled: z.boolean(),
  ...bannerCopy,
  english: z.object(bannerCopy).optional(),
  scripts: z.array(consentScript).max(maxConsentScripts).refine(items => new Set(items.map(item => item.id)).size === items.length,
    "Jedes Skript benötigt eine eindeutige Kennung.").optional(),
});
