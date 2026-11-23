"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface EditingSession {
  field: HTMLElement;
  initialNodes: Node[];
  initialMarkup: string;
}

/** Inline fields commit on blur so a typing session becomes one CMS undo step. */
export function useCanvasTextDraft(
  stage: RefObject<HTMLElement | null>,
  enabled: boolean,
  dirty: boolean,
  busy: string | null,
  onSave: () => Promise<void>,
) {
  const session = useRef<EditingSession | null>(null);
  const [pendingText, setPendingText] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const doc = stage.current?.ownerDocument ?? document;

    function findField(target: EventTarget | null) {
      const field = target instanceof Element ? target.closest<HTMLElement>('[contenteditable="true"]') : null;
      return field && stage.current?.contains(field) ? field : null;
    }

    function begin(event: FocusEvent) {
      const field = findField(event.target);
      if (!field) return;
      session.current = {
        field,
        initialNodes: Array.from(field.childNodes, node => node.cloneNode(true)),
        initialMarkup: field.innerHTML,
      };
      setPendingText(false);
    }

    function changed() {
      const active = session.current;
      if (active) setPendingText(active.field.innerHTML !== active.initialMarkup);
    }

    function afterPaste() {
      // The existing plain-text paste handler inserts through the DOM Range API.
      queueMicrotask(changed);
    }

    function ended(event: FocusEvent) {
      const field = session.current?.field;
      if (!field || field !== event.target) return;
      // The legacy renderers read innerText on blur. Keep capitalisation from
      // the author rather than copying a heading's visual text-transform.
      if (doc.defaultView?.getComputedStyle(field).textTransform !== "none") {
        const value = field.style.getPropertyValue("text-transform");
        const priority = field.style.getPropertyPriority("text-transform");
        field.style.setProperty("text-transform", "none", "important");
        queueMicrotask(() => {
          if (value) field.style.setProperty("text-transform", value, priority);
          else field.style.removeProperty("text-transform");
        });
      }
      session.current = null;
      setPendingText(false);
    }

    function key(event: KeyboardEvent) {
      const active = session.current;
      if (!active || event.isComposing || event.keyCode === 229 || findField(event.target) !== active.field) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        active.field.replaceChildren(...active.initialNodes.map(node => node.cloneNode(true)));
        setPendingText(false);
        const selection = doc.getSelection();
        selection?.selectAllChildren(active.field);
        selection?.collapseToEnd();
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.stopPropagation();
        active.field.blur();
        if (active.field.isConnected) active.field.focus({ preventScroll: true });
      }
    }

    doc.addEventListener("focusin", begin, true);
    doc.addEventListener("focusout", ended, true);
    doc.addEventListener("input", changed, true);
    doc.addEventListener("paste", afterPaste, true);
    doc.addEventListener("keydown", key, true);
    return () => {
      doc.removeEventListener("focusin", begin, true);
      doc.removeEventListener("focusout", ended, true);
      doc.removeEventListener("input", changed, true);
      doc.removeEventListener("paste", afterPaste, true);
      doc.removeEventListener("keydown", key, true);
      session.current = null;
    };
  }, [stage, enabled]);

  useEffect(() => {
    if (!enabled || !pendingText) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [enabled, pendingText]);

  const saveDraft = useCallback(async () => {
    if (enabled) {
      if (busy) return;
      // Flush the active field through its normal authoring callback before
      // saveDraft snapshots the editor's current draft reference.
      session.current?.field.blur();
    }
    await onSave();
  }, [enabled, busy, onSave]);

  useEffect(() => {
    if (!enabled) return;
    function shortcut(event: KeyboardEvent) {
      if ((!event.metaKey && !event.ctrlKey) || event.altKey || event.shiftKey ||
          event.key.toLowerCase() !== "s" || event.isComposing || event.keyCode === 229 || event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest('dialog[open]') ||
          !stage.current?.closest(".cms-editor")?.contains(target)) return;
      event.preventDefault();
      if (!event.repeat && !busy && (pendingText || dirty)) void saveDraft();
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [busy, dirty, enabled, pendingText, saveDraft, stage]);

  return { pendingText: enabled && pendingText, saveDraft };
}
