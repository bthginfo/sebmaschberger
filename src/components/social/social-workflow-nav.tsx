"use client";

import {CalendarDays, Palette, Link2} from "lucide-react";
import "@/styles/social-workflow.css";
import { useAdminLanguage } from "@/components/admin/admin-language";

export type SocialNavigationGuard = (action: () => void) => void;

/** The two tools share one task: design in the Studio, arrange dates in the Planner. */
export function SocialWorkflowNav({current, onStudio, onPlanner, onChannels, disabled = false}: {
  current: "studio" | "planner";
  onStudio?: () => void;
  onPlanner?: () => void;
  onChannels?: () => void;
  disabled?: boolean;
}) {
  const { t } = useAdminLanguage();
  return <nav className="social-workflow-nav" aria-label={t("Social-Arbeitsbereich")}>
    <button type="button" aria-label={t("Social-Studio")} aria-current={current === "studio" ? "page" : undefined} disabled={disabled} onClick={current === "studio" ? undefined : onStudio}><Palette size={16} aria-hidden="true"/><span>Studio</span></button>
    <button type="button" aria-label={t("Post-Planer")} aria-current={current === "planner" ? "page" : undefined} disabled={disabled} onClick={current === "planner" ? undefined : onPlanner}><CalendarDays size={16} aria-hidden="true"/><span>{t("Planer")}</span></button>
    {onChannels&&<button type="button" aria-label={t("Social-Kanäle verbinden")} disabled={disabled} onClick={onChannels}><Link2 size={16} aria-hidden="true"/><span>{t("Kanäle")}</span></button>}
  </nav>;
}
