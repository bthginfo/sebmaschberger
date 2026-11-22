"use client";

import type { CmsState, PageContent, WebsiteContent } from "@/lib/types";
import { publicationChanges } from "@/lib/publication-changes";
import { Button, Modal } from "./admin-ui";

const statusLabel = { added: "Neu", removed: "Entfernt", changed: "Geändert" };

export function PublicationReview({ state, onClose, onConfirm, busy, t = value => value, pathFor }: {
  state: CmsState;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  t?: (message: string) => string;
  pathFor?: (page: PageContent, snapshot: WebsiteContent) => string;
}) {
  const changes = publicationChanges(state.published, state.draft, pathFor);
  return <Modal title={t("Veröffentlichung prüfen")} description={t("Vergleichen Sie den gespeicherten Entwurf mit dem aktuellen Stand Ihrer Website.")}
    wide busy={busy} onClose={onClose} footer={<>
      <Button disabled={busy} onClick={onClose}>{t("Zurück zum Entwurf")}</Button>
      <Button variant="primary" busy={busy} onClick={onConfirm}>{t("Jetzt veröffentlichen")}</Button>
    </>}>
    {changes.length ? <div className="cms-publication-review">
      {changes.map(change => <details className="cms-details" key={change.id} open={changes.length === 1 || undefined}>
        <summary><strong>{t(change.name)}</strong><span>{t(statusLabel[change.kind])}</span></summary>
        <ul>{change.fields.map((field, index) => <li key={index}>
          <span>{t(field.name)}</span>
          {field.before !== undefined && <del>{field.before}</del>}
          {field.after !== undefined && <ins>{field.after}</ins>}
        </li>)}</ul>
      </details>)}
    </div> : <p>{t(state.publishedAt ? "Der Entwurf enthält keine sichtbaren Änderungen." : "Der gespeicherte Entwurf wird erstmals veröffentlicht.")}</p>}
  </Modal>;
}
