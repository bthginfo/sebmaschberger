"use client";

import { createContext, useContext, type ReactNode } from "react";

const HeadingHierarchy = createContext<{ firstSectionId: string | null; sectionId?: string; readOnlySectionIds?: readonly string[] }>({ firstSectionId: null });

export function PageHeadingProvider({ firstSectionId, readOnlySectionIds, children }: { firstSectionId: string | null; readOnlySectionIds?: readonly string[]; children: ReactNode }) {
  return <HeadingHierarchy.Provider value={{ firstSectionId, readOnlySectionIds }}>{children}</HeadingHierarchy.Provider>;
}

export function SectionHeadingProvider({ sectionId, children }: { sectionId: string; children: ReactNode }) {
  const hierarchy = useContext(HeadingHierarchy);
  return <HeadingHierarchy.Provider value={{ ...hierarchy, sectionId }}>{children}</HeadingHierarchy.Provider>;
}

export function useSectionHeadingLevel(sectionId?: string): "h1" | "h2" {
  const hierarchy = useContext(HeadingHierarchy);
  return (sectionId ?? hierarchy.sectionId) === hierarchy.firstSectionId ? "h1" : "h2";
}

export function useSectionContentEditable(editable?: boolean) {
  const { sectionId, readOnlySectionIds } = useContext(HeadingHierarchy);
  return Boolean(editable && (!sectionId || !readOnlySectionIds?.includes(sectionId)));
}
