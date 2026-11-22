"use client";

import { useEffect, useRef, useState } from 'react';
import { useAdminLanguage } from "@/components/admin/admin-language";
import type { WorkspaceCopy, WorkspacePanel } from "@/lib/workspace/panel";

export function WorkspaceAssistant() {
  const { language, t } = useAdminLanguage();
  const root = useRef<HTMLDivElement>(null);
  const copy = useRef<WorkspaceCopy>({ language, t });
  const panel = useRef<WorkspacePanel | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    copy.current = { language, t };
    panel.current?.setCopy(copy.current);
  }, [language, t]);
  useEffect(() => {
    let mounted = true;
    void import('@/lib/assistant/workspace-panel').then(({ mountWorkspaceAssistant }) => {
      if (!mounted || !root.current) return;
      panel.current = mountWorkspaceAssistant(root.current, copy.current);
      setStatus("ready");
    }).catch(() => {
      if (mounted) setStatus("failed");
    });
    return () => {
      mounted = false;
      panel.current?.dispose();
      panel.current = null;
    };
  }, []);
  return <>
    {status === "loading" && <p role="status">{t("Arbeitsbereich wird geladen …")}</p>}
    {status === "failed" && <p role="alert">{t("Der Arbeitsbereich konnte nicht geladen werden. Öffnen Sie den Assistenten erneut.")}</p>}
    <div className="workspace-assistant" ref={root} />
  </>;
}
