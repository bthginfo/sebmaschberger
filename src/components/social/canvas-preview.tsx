"use client";

import { memo, useEffect, useRef, useState } from "react";
import { formatOf, type SocialProject } from "@/lib/social/model";
import { drawSlide, prepareProject } from "@/lib/social/render";
import {createVideoFrames} from "@/lib/social/video-frames";
import { useAdminLanguage } from "@/components/admin/admin-language";

export const CanvasPreview = memo(function CanvasPreview({ project, index = 0, label, thumbnail = true }: { project: SocialProject; index?: number; label: string; thumbnail?: boolean }) {
  const { t } = useAdminLanguage();
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const canvas = ref.current;
    if (!canvas) return;
    const format = formatOf(project), scale = thumbnail ? Math.min(1, 360 / format.width) : 1;
    canvas.width = Math.round(format.width * scale); canvas.height = Math.round(format.height * scale);
    setError(false);
    const slide=project.slides[index]||project.slides[0];
    const decoder=createVideoFrames(480);
    let observer:IntersectionObserver|undefined;
    void prepareProject({...project,slides:[slide]}).then(resources => {
      if (!active) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(scale, scale);
      drawSlide(context, slide, format.width, format.height, resources);
      if(slide.elements.some(item=>item.type==="video"&&!item.hidden)){
        observer=new IntersectionObserver(([entry])=>{
          if(!entry.isIntersecting)return;
          observer?.disconnect();
          void decoder.sampleSlide(slide,0).then(videoFrames=>{
            if(active)drawSlide(context,slide,format.width,format.height,resources,{videoFrames});
          }).catch(()=>{}).finally(()=>decoder.dispose());
        });
        observer.observe(canvas);
      }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false;observer?.disconnect();decoder.dispose(); };
  }, [project, index, thumbnail]);
  return <span className="social-preview" style={{ aspectRatio: `${formatOf(project).width}/${formatOf(project).height}` }}><canvas ref={ref} role="img" aria-label={label} />{error && <span>{t("Vorschau nicht verfügbar")}</span>}</span>;
});
