import { z } from "zod";
import { CMS_TYPEFACES, cmsAppearanceColor } from "./cms-typefaces";

const color = z.string().refine(cmsAppearanceColor).optional();
const typeface = z.enum(Object.keys(CMS_TYPEFACES) as [keyof typeof CMS_TYPEFACES, ...(keyof typeof CMS_TYPEFACES)[]]).optional();
export const cmsAppearanceSchema = z.object({
  headingTypeface: typeface, bodyTypeface: typeface,
  headingScale: z.number().min(.75).max(1.4).optional(), bodyScale: z.number().min(.75).max(1.4).optional(),
  background: color, textColor: color, headingColor: color, cardBackground: color,
  buttonBackground: color, buttonTextColor: color, secondaryLinkColor: color, iconColor: color,
}).strict();
