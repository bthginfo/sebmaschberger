"use client";

import { useMemo } from "react";
import { useAdminLanguage } from "./admin-language";
import { templateEditorPages } from "@/lib/route-templates";
import type { RouteTemplateKey } from "@/lib/route-template-keys";
import { PageEditor, type EditorProps } from "./page-editor";

type Props = Pick<EditorProps, "privateCanvasTools" | "content" | "cmsState" | "onChange" | "media" | "onUpload" | "dirty" | "busy" | "onSave" | "onPublish" | "onRestore" | "undo" | "redo" | "canUndo" | "canRedo" | "initialPageId">;

export function RouteTemplateEditor({ content, onChange, ...props }: Props) {
  const { t } = useAdminLanguage();
  const pages = useMemo(() => templateEditorPages(content).map(page => ({ ...page, title: t(page.title) })), [content, t]);
  return <PageEditor {...props} content={{ ...content, pages }} templateSource={content} onChange={next => {
    const templates = { ...content.templates };
    for (const page of next.pages) {
      const original = pages.find(candidate => candidate.id === page.id);
      if (!original || original === page) continue;
      templates[page.id as RouteTemplateKey] = { seo: page.seo, sections: page.sections };
    }
    onChange({ ...content, templates });
  }} />;
}
