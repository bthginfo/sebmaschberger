"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminLanguage } from "./admin-language";
import type { WorkspaceCopy, WorkspacePanel } from "@/lib/workspace/panel";
import "@/lib/workspace/newsletter.css";

const panels = {
  analytics: { label: "Webanalyse", load: () => import("@/lib/workspace/analytics-panel").then(module => module.mountAnalyticsPanel) },
  newsletter: { label: "Newsletter", load: () => import("@/lib/workspace/newsletter-panel").then(module => module.mountNewsletterPanel) },
  agents: { label: "KI und Agenten", load: () => import("@/lib/workspace/agents-panel").then(module => module.mountAgentsPanel) },
} as const;

export function ModulePanel({ kind }: { kind: keyof typeof panels }) {
  const { language, t } = useAdminLanguage();
  const copy = useRef<WorkspaceCopy>({ language, t });
  const root = useRef<HTMLDivElement>(null);
  const mounted = useRef<WorkspacePanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    copy.current = { language, t };
    mounted.current?.setCopy(copy.current);
  }, [language, t]);

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setFailed(false);
    void panels[kind].load().then(mount => {
      if (disposed || !root.current) return;
      mounted.current = mount(root.current, copy.current);
      setLoading(false);
    }).catch(() => {
      if (disposed) return;
      setFailed(true);
      setLoading(false);
    });
    return () => {
      disposed = true;
      mounted.current?.dispose();
      mounted.current = null;
    };
  }, [kind]);

  const label = t(panels[kind].label);
  return <>
    {loading && <p className="cm-initial-loading" role="status">{t("{panel} wird geladen …", { panel: label })}</p>}
    {failed && <p className="cm-notice cm-error" role="alert">{t("Der Bereich konnte nicht geladen werden. Bitte die Seite neu laden.")}</p>}
    <div ref={root} aria-label={label} />
  </>;
}
