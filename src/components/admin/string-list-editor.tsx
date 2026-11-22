"use client";

import { ArrowDown, ArrowUp, Button, Field, IconButton, Input, Plus, Trash2 } from "./admin-ui";
import { useAdminLanguage } from "@/components/admin/admin-language";

export function StringListEditor({ label, itemLabel, values, onChange, placeholder }: { label: string; itemLabel: string; values: string[]; onChange: (values: string[]) => void; placeholder?: string }) {
  const { t } = useAdminLanguage();
  function move(index: number, direction: number) { const next = [...values]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onChange(next); }
  return <div className="cms-string-list"><div className="cms-inline-heading"><span className="cms-label">{label}</span><span className="cms-string-list-count">{values.length}</span></div>{values.map((value, index) => <div className="cms-string-list-row" key={index}><Field label={`${itemLabel} ${index + 1}`}><Input value={value} placeholder={placeholder} onChange={event => onChange(values.map((entry, position) => position === index ? event.target.value : entry))} /></Field><div><IconButton label={t("{0} {1} nach oben verschieben", { 0: itemLabel, 1: index + 1 })} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></IconButton><IconButton label={t("{0} {1} nach unten verschieben", { 0: itemLabel, 1: index + 1 })} disabled={index === values.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></IconButton><IconButton label={t("{0} {1} entfernen", { 0: itemLabel, 1: index + 1 })} onClick={() => onChange(values.filter((_, position) => position !== index))}><Trash2 size={14} /></IconButton></div></div>)}<Button onClick={() => onChange([...values, ""])}><Plus size={14} />{itemLabel}{" " + t("hinzufügen")}</Button></div>;
}
