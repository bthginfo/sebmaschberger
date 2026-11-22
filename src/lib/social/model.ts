import { z } from 'zod';
import {MAX_VIDEO_DURATION_MS,videoId,videoSource} from './video-model';

export const FONT_IDS = ['outfit','manrope','dm-sans','barlow-condensed','inter','space-grotesk','sora','syne','archivo','oswald','playfair-display','cormorant-garamond','bodoni-moda','fraunces','rubik','fira-code'] as const;
export const SHAPES = ['rectangle','ellipse','pill','line','triangle','diamond','hexagon','star','arrow','lightning','speech','ring','arch','cross','ticket','burst','bracket','wave','heart','check'] as const;
export const ARTWORKS = ['browser','workflow','orbit','grid','spark','cursor','chat','monogram','ribbon','dots','window','stack'] as const;
export const ANIMATIONS = ['none','fade','rise','slide-left','zoom','float','typewriter','pan-up','pan-down','pan-left','pan-right'] as const;
export const TRANSITIONS = ['none','fade','slide-left','slide-up','wipe','zoom'] as const;
export const FORMATS = [
 { id:'portrait', label:'Instagram Portrait', width:1080, height:1350, ratio:'4:5' },
 { id:'square', label:'Instagram Quadrat', width:1080, height:1080, ratio:'1:1' },
 { id:'tall', label:'Instagram Hochformat', width:1080, height:1440, ratio:'3:4' },
 { id:'story', label:'Story / Reel', width:1080, height:1920, ratio:'9:16' },
 { id:'landscape', label:'Querformat', width:1080, height:566, ratio:'1.91:1' }
] as const;
export type FontId = typeof FONT_IDS[number];
export type FormatId = typeof FORMATS[number]['id'];
export const idSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/);
const color = z.string().regex(/^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/);
const coordinate = z.number().finite().min(-10000).max(10000);
export const assetSourceSchema = z.string().max(300).regex(/^\/(?:api\/admin\/social\/(?:assets|media)\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}|social-studio\/[a-zA-Z0-9_-]+\.(?:svg|webp|png))$/, 'Bitte verwenden Sie ein Bild aus Ihrer Mediathek.');
const assetSource = assetSourceSchema;
export const brandSchema = z.object({ name:z.string().trim().min(1).max(100), website:z.string().trim().max(300).refine(value=>!value||/^https?:\/\/[^\s]+$/i.test(value),'Bitte eine vollständige Website-Adresse eintragen.'), accent:color, ink:color, paper:color, headlineFont:z.enum(FONT_IDS), bodyFont:z.enum(FONT_IDS), logoSrc:assetSource.optional() }).strict();
export type SocialBrandProfile = z.infer<typeof brandSchema>;

export const elementSchema = z.object({
 id:idSchema, type:z.enum(['text','shape','image','video','logo','artwork']), name:z.string().max(100),
 x:coordinate, y:coordinate, width:z.number().finite().min(1).max(10000), height:z.number().finite().min(1).max(10000),
 rotation:z.number().finite().min(-3600).max(3600), opacity:z.number().min(0).max(1), locked:z.boolean(), hidden:z.boolean(),
 text:z.string().max(5000).optional(), fontId:z.enum(FONT_IDS).optional(), fontSize:z.number().min(6).max(600).optional(),
 fontWeight:z.number().int().min(100).max(900).optional(), italic:z.boolean().optional(), underline:z.boolean().optional(),
 align:z.enum(['left','center','right']).optional(), lineHeight:z.number().min(.6).max(3).optional(),
 letterSpacing:z.number().min(-30).max(100).optional(), color:color.optional(), fill:color.optional(),
 stroke:color.optional(), strokeWidth:z.number().min(0).max(100).optional(), radius:z.number().min(0).max(1000).optional(),
 shape:z.enum(SHAPES).optional(), artwork:z.enum(ARTWORKS).optional(), src:z.union([assetSource,videoSource]).optional(),clipStartMs:z.number().int().min(0).max(MAX_VIDEO_DURATION_MS).optional(),
 fit:z.enum(['cover','contain']).optional(), cropX:z.number().min(0).max(1).optional(), cropY:z.number().min(0).max(1).optional(),
 variant:z.enum(['wordmark','mark']).optional(),
 animation:z.enum(ANIMATIONS).optional(), animationDelayMs:z.number().int().min(0).max(30000).optional(),
 animationDurationMs:z.number().int().min(100).max(10000).optional(),
 gradient:z.enum(['none','linear','radial']).optional(), gradientColor:color.optional(),
 shadow:z.boolean().optional(), groupId:idSchema.optional()
}).strict().superRefine((element,ctx)=>{
 if(element.animation?.startsWith('pan-')&&element.type!=='image')ctx.addIssue({code:'custom',message:'Bildschwenks sind nur für Bildebenen verfügbar.',path:['animation']});
 if(element.type==='video'&&(!element.src||!videoId(element.src)))ctx.addIssue({code:'custom',message:'Dieses Video braucht eine Quelle aus der Studio-Mediathek.',path:['src']});
 if(element.type!=='video'&&element.src&&videoId(element.src))ctx.addIssue({code:'custom',message:'Diese Quelle gehört zu einer Videoebene.',path:['src']});
 if(element.type==='image'&&!element.src)ctx.addIssue({code:'custom',message:'Dieses Bild hat keine Quelle.',path:['src']});
 if(element.type==='text'&&element.text===undefined)ctx.addIssue({code:'custom',message:'Der Textinhalt fehlt.',path:['text']});
});
export const slideSchema = z.object({
 id:idSchema, name:z.string().min(1).max(100), durationMs:z.number().int().min(500).max(30000),
 background:color, transition:z.enum(TRANSITIONS), transitionMs:z.number().int().min(0).max(2000),
 elements:z.array(elementSchema).max(100)
}).strict().superRefine((slide,ctx)=>{
 if(slide.elements.filter(element=>element.type==='video').length>2)ctx.addIssue({code:'custom',message:'Eine Slide kann bis zu zwei Videoebenen enthalten.',path:['elements']});
 if(slide.transitionMs>slide.durationMs/2)ctx.addIssue({code:'custom',message:'Der Übergang darf höchstens die halbe Slide-Dauer belegen.',path:['transitionMs']});
 if(new Set(slide.elements.map(element=>element.id)).size!==slide.elements.length)ctx.addIssue({code:'custom',message:'Ebenen benötigen eindeutige Kennungen.',path:['elements']});
});
export const projectSchema = z.object({
 id:idSchema, brand:brandSchema, kind:z.enum(['post','reel']), title:z.string().trim().min(1).max(140),
 caption:z.string().max(2200), tags:z.array(z.string().max(60)).max(20), formatId:z.enum(['portrait','square','tall','story','landscape']),
 slides:z.array(slideSchema).min(1).max(30), schemaVersion:z.literal(1)
}).strict().superRefine((project,ctx)=>{
 if(new Set(project.slides.map(slide=>slide.id)).size!==project.slides.length)ctx.addIssue({code:'custom',message:'Slides benötigen eindeutige Kennungen.',path:['slides']});
 const duration=project.slides.reduce((sum,slide)=>sum+slide.durationMs,0);
 if(project.kind==='reel'&&duration>90000)ctx.addIssue({code:'custom',message:'Ein Reel darf hier höchstens 90 Sekunden lang sein.',path:['slides']});
 if(project.kind==='reel'&&project.formatId!=='story')ctx.addIssue({code:'custom',message:'Reels verwenden das Format 9:16.',path:['formatId']});
});
export type SocialElement = z.infer<typeof elementSchema>;
export type SocialSlide = z.infer<typeof slideSchema>;
export type SocialProject = z.infer<typeof projectSchema>;
export type SocialSnapshot = { project:SocialProject; revision:number; updatedAt:string|null };
export type SocialProjectSummary = { id:string; brandName:string; brand?:SocialBrandProfile; kind:'post'|'reel'; title:string; tags:string[]; formatId:FormatId; slides:number; durationMs:number; revision:number; updatedAt:string|null; cover:SocialSlide };
export type SocialAsset = { id:string; name:string; src:string; width:number; height:number; mimeType:string; createdAt:string; durationMs?:number; size?:number };
export type SocialWorkspace = { projects:SocialProjectSummary[]; assets:SocialAsset[]; media:SocialAsset[]; brand:SocialBrandProfile; brandRevision:number; initial:SocialSnapshot|null };
export const saveSchema = z.object({idempotencyKey:z.uuid(),baseRevision:z.number().int().nonnegative(),project:projectSchema}).strict();
export const archiveSchema = z.object({idempotencyKey:z.uuid(),baseRevision:z.number().int().positive(),id:idSchema}).strict();
export const formatOf=(project:Pick<SocialProject,'formatId'>)=>FORMATS.find(format=>format.id===project.formatId)!;
export const durationOf=(project:Pick<SocialProject,'slides'>)=>project.slides.reduce((sum,slide)=>sum+slide.durationMs,0);
export function summarize(snapshot:SocialSnapshot):SocialProjectSummary {const project=snapshot.project;return{id:project.id,brandName:project.brand.name,brand:structuredClone(project.brand),kind:project.kind,title:project.title,tags:project.tags,formatId:project.formatId,slides:project.slides.length,durationMs:durationOf(project),revision:snapshot.revision,updatedAt:snapshot.updatedAt,cover:project.slides[0]};}

export const brandSaveSchema = z.object({idempotencyKey:z.uuid(),baseRevision:z.number().int().nonnegative(),brand:brandSchema}).strict();
