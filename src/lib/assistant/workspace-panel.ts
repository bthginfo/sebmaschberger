import { node, request } from '../workspace/panel';
import type { WorkspaceCopy, WorkspacePanel } from '../workspace/panel';
import type { AdminMessageValues } from '../admin-i18n/locale';
import type {
  WorkspaceActionInfo, WorkspaceApproval, WorkspaceCatalog, WorkspaceFacts,
  WorkspaceField, WorkspaceQuery, WorkspaceReply, WorkspaceRequest, WorkspaceResult, WorkspaceRow
} from './workspace';
import './workspace.css';

const endpoint = '/api/admin/assistant/workspace';

const statusLabels: Record<string, string> = {
  new: 'Neu', 'in-progress': 'In Arbeit', done: 'Erledigt', spam: 'Spam', converted: 'Übernommen',
  draft: 'Entwurf', issued: 'Ausgestellt', partially_paid: 'Teilbezahlt', paid: 'Bezahlt',
  accepted: 'Angenommen', declined: 'Abgelehnt', cancelled: 'Storniert', archived: 'Archiviert',
  active: 'Aktiv', inactive: 'Inaktiv', pending: 'Offen', fulfilled: 'Ausgeliefert', failed: 'Fehlgeschlagen',
  published: 'Veröffentlicht', refunded: 'Erstattet', visible: 'Sichtbar', hidden: 'Ausgeblendet',
  sent: 'Gesendet', sending: 'Wird gesendet', 'not-configured': 'Versand nicht eingerichtet',
  discovery: 'Erstgespräch', planning: 'Planung', development: 'Umsetzung', review: 'Prüfung', completed: 'Abgeschlossen'
};

type ManualField = { key: string; label: string; type?: 'date' | 'amount' | 'textarea'; values?: string[]; required?: boolean };
type ManualAction = { statuses?: string[]; fields?: ManualField[] };
const manual: Record<string, ManualAction> = {
  'lead.convert': { statuses: ['new'] },
  'offer.issue': { statuses: ['draft'] },
  'invoice.issue': { statuses: ['draft'] },
  'invoice.payment': { statuses: ['issued', 'partially_paid'], fields: [
    { key: 'amountCents', label: 'Eingegangener Betrag in Euro', type: 'amount', required: true },
    { key: 'paidAt', label: 'Zahlungsdatum', type: 'date', required: true },
    { key: 'note', label: 'Notiz (optional)' }
  ] },
  'invoice.cancel': { statuses: ['issued', 'partially_paid', 'paid'],
    fields: [{ key: 'reason', label: 'Stornogrund', type: 'textarea', required: true }] },
  'portal.revoke': { statuses: ['active'] },
  'social.archive': {},
  'planner.approve': { statuses: ['draft', 'paused', 'failed'] },
  'planner.cancel': { statuses: ['scheduled', 'scheduling', 'processing'] },
  'planner.complete': { statuses: ['draft', 'manual', 'manual-planned', 'planned'] },
  'delivery.retry': { statuses: ['failed'] },
  'inquiry.update': { fields: [
    { key: 'status', label: 'Status', values: ['new', 'in-progress', 'done', 'spam'] },
    { key: 'note', label: 'Interne Notiz (optional)', type: 'textarea' }
  ] },
  'order.fulfill': { statuses: ['paid'], fields: [{ key: 'tracking', label: 'Sendungsverfolgung (optional)' }] },
  'order.retry-mail': { statuses: ['paid', 'refunded'] },
  'media.alt': { fields: [{ key: 'alt', label: 'Alternativtext', type: 'textarea' }] },
  'cms.restore': {},
  'cms.post.publish': { statuses: ['draft'] },
  'cms.post.unpublish': { statuses: ['published'] },
  'cms.post.delete': {}
};

const labelValue = (value: WorkspaceField['value'], { t }: WorkspaceCopy) => value === true ? t('Ja') : value === false ? t('Nein')
  : String(value ?? '');

function link(href: string | undefined, title: string) {
  if (!href || !/^\/(?:admin(?:\/|\?|$)|api\/admin\/business-documents\/order\/)/.test(href) || /[\\\r\n]/.test(href)) return null;
  const anchor = node('a', title, 'wa-link');
  anchor.href = href;
  return anchor;
}

function actionButton(title: string, action?: () => void, primary = false) {
  const button = node('button', title, primary ? 'wa-button wa-primary' : 'wa-button');
  button.type = 'button';
  if (action) button.addEventListener('click', action);
  return button;
}

function displayPositions(value: string, { language, t }: WorkspaceCopy): string {
  try {
    const lines: unknown = JSON.parse(value);
    if (!Array.isArray(lines)) return value;
    const currency = new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'de-DE', { style: 'currency', currency: 'EUR' });
    const labels = lines.map(line => {
      if (!line || typeof line !== 'object') return '';
      const title = line.produkt ?? line.description ?? line.title;
      const quantity = line.menge ?? line.quantity;
      const cents = line.einzelpreisCent ?? line.unitPriceCents;
      if (typeof title !== 'string' || typeof quantity !== 'number') return '';
      return quantity + ' × ' + title
        + (typeof line.variante === 'string' && line.variante ? ' · ' + line.variante : '')
        + (typeof cents === 'number' ? ' · ' + t('{price} pro Stück', { price: currency.format(cents / 100) }) : '');
    });
    return labels.every(Boolean) ? labels.join('\n') : value;
  } catch {
    return value;
  }
}

function promptChoices(areas: WorkspaceCatalog['areas']) {
  const available = new Set(areas.map(area => area.id));
  return [
    ['inquiries', 'Neue Anfragen', 'Welche neuen Anfragen sind eingegangen?'],
    [available.has('invoices') ? 'invoices' : 'orders', available.has('invoices') ? 'Offene Rechnungen' : 'Bestellungen',
      available.has('invoices') ? 'Welche Rechnungen sind offen?' : 'Welche Bestellungen sind eingegangen?'],
    ['pages', 'Seiten finden', 'Welche Seiten gibt es im gespeicherten Entwurf?']
  ].filter(([area]) => available.has(area));
}

export function mountWorkspaceAssistant(root: HTMLElement, initialCopy: WorkspaceCopy): WorkspacePanel {
  let alive = true;
  let pending = false;
  let catalog: WorkspaceCatalog | undefined;
  let approval: WorkspaceApproval | undefined;
  const abort = new AbortController();
  let activeQuestion: AbortController | null = null;
  const history: Array<{ question: string; answer: string }> = [];
  let copy = initialCopy;
  const labels = new Map<HTMLElement, (copy: WorkspaceCopy) => void>();

  function bindCopy<T extends HTMLElement>(element: T, write: (element: T, copy: WorkspaceCopy) => void): T {
    const update = (next: WorkspaceCopy) => write(element, next);
    update(copy);
    labels.set(element, update);
    return element;
  }

  function copyText<T extends HTMLElement>(element: T, message: string, values?: AdminMessageValues): T {
    return bindCopy(element, (target, { t }) => { target.textContent = t(message, values); });
  }

  function text<K extends keyof HTMLElementTagNameMap>(tag: K, message: string, className = "", values?: AdminMessageValues) {
    return copyText(node(tag, "", className), message, values);
  }

  function button(title: string, action?: () => void, primary = false) {
    return copyText(actionButton("", action, primary), title);
  }

  function labeled(title: string, input: HTMLElement) {
    const label = node('label', '', 'wa-field');
    label.append(text('span', title), input);
    return label;
  }

  function option(value: string, title: string) {
    const item = text('option', title);
    item.value = value;
    return item;
  }

  function localizedLink(href: string | undefined, title: string) {
    const anchor = link(href, "");
    return anchor ? copyText(anchor, title) : null;
  }

  function discardDetachedLabels() {
    for (const element of labels.keys()) if (!root.contains(element)) labels.delete(element);
  }

  function detailsList(fields: WorkspaceField[], review = false) {
    const list = node('dl', '', 'wa-fields');
    for (const { label, value } of fields) {
      if (value === null || !review && value === '') continue;
      if (!review && /-ID$|^Version$|^Revision$/.test(label)) continue;
      let sections: string | undefined;
      if (!review && label === 'Abschnitte') {
        try { sections = (JSON.parse(String(value)) as Array<{ name?: string; type: string }>).map(item => item.name || item.type).join(', '); }
        catch { continue; }
      }
      const description = bindCopy(node('dd'), (element, next) => {
        let valueText = sections ?? (review && value === '' ? next.t('Leer') : labelValue(value, next));
        if (!review && label === 'Positionen') valueText = displayPositions(valueText, next);
        if (!review && ['Status', 'Auslieferung', 'Mailstatus'].includes(label)) valueText = next.t(statusLabels[valueText] ?? valueText);
        element.textContent = valueText;
      });
      list.append(text('dt', label), description);
    }
    return list;
  }

  const intro = text('p', 'Fragen stellen, Einträge suchen und Änderungen direkt im CMS vorbereiten.', 'wa-intro');
  const suggestions = node('div', '', 'wa-suggestions');
  const ask = node('form', '', 'wa-ask');
  const question = node('textarea');
  question.name = 'question';
  bindCopy(question, (element, { t }) => { element.placeholder = t('Zum Beispiel: Welche Rechnungen sind offen?'); });
  question.rows = 2;
  question.maxLength = 2000;
  question.required = true;
  const send = button('Frage stellen', undefined, true);
  send.type = 'submit';
  const stop = button('Abbrechen', () => activeQuestion?.abort());
  stop.hidden = true;
  const mode = node('p', '', 'wa-mode');
  ask.append(labeled('Frage oder Auftrag', question), node('div', '', 'wa-form-actions'));
  ask.lastElementChild!.append(mode, stop, send);

  const searchPanel = node('details', '', 'wa-disclosure');
  searchPanel.append(text('summary', 'Gespeicherte Daten suchen'));
  const searchForm = node('form', '', 'wa-search');
  const scope = node('select');
  const search = node('input');
  search.type = 'search';
  bindCopy(search, (element, { t }) => { element.placeholder = t('Titel, Name oder Belegnummer'); });
  search.maxLength = 180;
  const find = button('Suchen');
  find.type = 'submit';
  searchForm.append(labeled('Bereich', scope), labeled('Suchbegriff', search), find);
  searchPanel.append(searchForm);

  const live = node('p', '', 'wa-feedback');
  live.setAttribute('role', 'status');
  const output = node('div', '', 'wa-output');
  const review = node('div', '', 'wa-review-slot');
  const recent = node('details', '', 'wa-disclosure wa-history');
  const actionCatalog = node('details', '', 'wa-disclosure');
  actionCatalog.append(text('summary', 'Verfügbare Aktionen'));
  const actionList = node('ul', '', 'wa-action-list');
  actionCatalog.append(actionList);
  root.replaceChildren(intro, suggestions, ask, searchPanel, live, output, review, recent, actionCatalog);

  function feedback(text: string, error = false) {
    copyText(live, text);
    live.classList.toggle('wa-error', error);
    live.setAttribute('role', error ? 'alert' : 'status');
  }

  function setBusy(value: boolean) {
    pending = value;
    root.setAttribute('aria-busy', String(value));
    for (const element of root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('button,input,select,textarea')) {
      element.disabled = value || !catalog;
    }
  }

  async function run<T>(payload: WorkspaceRequest, busyLabel: string, success: (result: T) => void) {
    if (!alive || pending || !catalog) return;
    feedback(busyLabel);
    const questionRequest = payload.kind === 'ask' ? new AbortController() : null;
    activeQuestion = questionRequest;
    setBusy(true);
    if (questionRequest) {
      send.hidden = true;
      stop.hidden = false;
      stop.disabled = false;
      stop.focus({ preventScroll: true });
    }
    try {
      const result = await request<T>(endpoint, { method: 'POST', body: JSON.stringify(payload), signal: questionRequest?.signal ?? abort.signal });
      if (!alive || questionRequest?.signal.aborted) return;
      feedback('');
      success(result);
    } catch (error) {
      if (alive && !questionRequest?.signal.aborted) {
        const message = error instanceof Error ? error.message : 'Bitte versuchen Sie es erneut.';
        if (payload.kind === 'execute') {
          const reviewError = review.querySelector('.wa-review-error');
          if (reviewError instanceof HTMLElement) copyText(reviewError, message);
          else feedback(message, true);
        } else feedback(message, true);
      }
    } finally {
      const focusWasOnStop = document.activeElement === stop;
      if (questionRequest) {
        activeQuestion = null;
        stop.hidden = true;
        send.hidden = false;
        if (alive && questionRequest.signal.aborted) feedback('');
      }
      if (alive) {
        setBusy(false);
        discardDetachedLabels();
        if (questionRequest && focusWasOnStop) question.focus({ preventScroll: true });
      }
    }
  }

  function updateReview(next?: WorkspaceApproval) {
    approval = next;
    review.replaceChildren();
    if (!next) return;
    const card = node('section', '', 'wa-review');
    card.tabIndex = -1;
    bindCopy(card, (element, { t }) => { element.setAttribute('aria-label', t('Aktion prüfen')); });
    card.append(text('h3', next.title), text('p', next.effect), detailsList(next.fields, true));
    const reviewError = node('p', '', 'wa-review-error wa-error');
    reviewError.setAttribute('role', 'alert');
    card.append(reviewError);
    const actions = node('div', '', 'wa-review-actions');
    actions.append(button('Verwerfen', () => { updateReview(); discardDetachedLabels(); }), button('Aktion ausführen', () => {
      if (approval?.id !== next.id) return;
      void run<WorkspaceResult>({ kind: 'execute', approvalId: next.id }, 'Aktion wird ausgeführt …', result => {
        updateReview();
        output.replaceChildren(text('p', result.message, 'wa-success'));
        const destination = localizedLink(result.href, 'Bereich öffnen');
        if (destination) output.append(destination);
        feedback(result.message);
      });
    }, true));
    card.append(actions);
    review.append(card);
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: 'nearest' });
  }

  function buildRecordAction(facts: WorkspaceFacts, row: WorkspaceRow) {
    const enabled = catalog?.actions.filter(action => {
      const settings = manual[action.id.replace(/^creator\./, '')];
      if (action.area !== facts.area.id || !settings) return false;
      return !settings.statuses || settings.statuses.includes(row.status || '');
    }) || [];
    if (!enabled.length) return null;
    const picker = node('details', '', 'wa-record-actions');
    picker.append(text('summary', 'Aktion vorbereiten'));
    const form = node('form', '', 'wa-record-form');
    const selector = node('select');
    for (const action of enabled) selector.append(option(action.id, action.label));
    form.append(labeled('Aktion', selector));
    const fields = node('div', '', 'wa-record-inputs');
    form.append(fields);
    const prepare = button('Zur Prüfung');
    prepare.type = 'submit';
    form.append(prepare);
    picker.append(form);

    function showFields() {
      fields.replaceChildren();
      const config = manual[selector.value.replace(/^creator\./, '')];
      for (const descriptor of config.fields || []) {
        let control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (descriptor.values) {
          control = node('select');
          control.append(option('', 'Unverändert'));
          for (const value of descriptor.values) control.append(option(value, statusLabels[value] || value));
        } else if (descriptor.type === 'textarea') {
          control = node('textarea');
          control.rows = 2;
          control.maxLength = 10000;
        } else {
          control = node('input');
          control.type = descriptor.type === 'date' ? 'date' : 'text';
          control.maxLength = 500;
          if (descriptor.type === 'amount') control.inputMode = 'decimal';
        }
        control.name = descriptor.key;
        control.required = Boolean(descriptor.required);
        fields.append(labeled(descriptor.label, control));
      }
    }
    selector.addEventListener('change', () => { showFields(); discardDetachedLabels(); });
    showFields();
    form.addEventListener('submit', event => {
      event.preventDefault();
      const input: Record<string, unknown> = { id: row.id };
      for (const [key, value] of new FormData(form)) {
        const text = String(value).trim();
        if (!text && key !== 'alt') continue;
        if (key === 'amountCents') {
          if (!/^\d{1,10}(?:[,.]\d{1,2})?$/.test(text)) {
            feedback('Geben Sie den Betrag als Euro mit höchstens zwei Nachkommastellen ein.', true);
            return;
          }
          const [whole, decimal = ''] = text.replace(',', '.').split('.');
          input[key] = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
        } else input[key] = text;
      }
      void run<WorkspaceApproval>({ kind: 'prepare', action: selector.value, input }, 'Aktion wird vorbereitet …', updateReview);
    });
    return picker;
  }

  function factsCard(facts: WorkspaceFacts, expanded = false, isDetail = false) {
    const card = node('details', '', 'wa-source');
    card.open = expanded;
    const summary = bindCopy(node('summary'), (element, { language, t }) => {
      const count = new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'de-DE').format(facts.total);
      element.textContent = t(facts.area.label) + ' · ' + (facts.limited ? t('mind. {count}', { count }) : count);
    });
    card.append(summary);
    const content = node('div', '', 'wa-source-content');
    const destination = link(facts.area.href, '');
    if (destination) content.append(bindCopy(destination, (element, { t }) => {
      element.textContent = t('{area} öffnen', { area: t(facts.area.label) });
    }));
    if (facts.totals?.length) content.append(detailsList(facts.totals));
    if (!facts.rows.length) content.append(text('p', 'Keine passenden Einträge gefunden.'));
    for (const row of facts.rows) {
      const record = node('div', '', 'wa-record');
      const heading = node('div', '', 'wa-record-title');
      heading.append(node('strong', row.label));
      if (row.status) heading.append(text('span', statusLabels[row.status] || row.status));
      record.append(heading, detailsList(row.fields));
      const recordLink = localizedLink(row.href, 'Beleg öffnen');
      if (recordLink) record.append(recordLink);
      if (!isDetail) record.append(button('Details laden', () => {
        void readFacts({ area: facts.area.id, id: row.id, limit: 1 });
      }));
      const actions = buildRecordAction(facts, row);
      if (actions) record.append(actions);
      content.append(record);
    }
    if (facts.total > facts.rows.length) content.append(text('p', 'Die ersten {count} Einträge werden angezeigt. Grenzen Sie die Suche bei Bedarf ein.', '', { count: facts.rows.length }));
    card.append(content);
    return card;
  }

  async function readFacts(query: WorkspaceQuery) {
    await run<WorkspaceFacts>({ kind: 'read', query }, 'Einträge werden gesucht …', result => {
      updateReview();
      output.replaceChildren(factsCard(result, true, Boolean(query.id)));
    });
  }

  function renderHistory() {
    recent.replaceChildren(text('summary', 'Verlauf dieser Sitzung'));
    recent.hidden = history.length < 2;
    for (const turn of history.slice(0, -1).reverse()) {
      const item = node('div', '', 'wa-turn');
      item.append(node('strong', turn.question), node('p', turn.answer));
      recent.append(item);
    }
  }

  function askQuestion(value: string, area?: string, suggestion = false) {
    if (value.trim().length < 2 || pending) return;
    const previous = history.slice(-4).map(item => ({ question: item.question, answer: item.answer.slice(0, 4000) }));
    void run<WorkspaceReply>({ kind: 'ask', question: value.trim(), area, history: previous }, 'CMS-Daten werden geprüft …', reply => {
      history.push({ question: value, answer: reply.answer });
      if (history.length > 5) history.shift();
      const title = suggestion ? text('h3', value) : node('h3', value);
      const answer = node('p', reply.answer, 'wa-answer');
      output.replaceChildren(title, answer, ...reply.sources.map(facts => factsCard(facts, reply.mode === 'guided')));
      renderHistory();
      updateReview(reply.approval);
      if (!reply.approval) {
        if (document.activeElement === stop) {
          title.tabIndex = -1;
          title.focus({ preventScroll: true });
        }
        output.scrollIntoView({ block: 'nearest' });
      }
      if (question.value === value) question.value = '';
    });
  }

  question.setAttribute('aria-keyshortcuts', 'Control+Enter Meta+Enter');
  question.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing && !pending) {
      event.preventDefault();
      ask.requestSubmit();
    }
  });
  ask.addEventListener('submit', event => {
    event.preventDefault();
    askQuestion(question.value);
  });
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    void readFacts({ area: scope.value, search: search.value.trim(), limit: 8 });
  });
  recent.hidden = true;

  async function start() {
    setBusy(true);
    feedback('Arbeitsbereiche werden geladen …');
    try {
      const data = await request<WorkspaceCatalog>(endpoint, { signal: abort.signal });
      if (!alive) return;
      catalog = data;
      const hint = data.configured ? 'Abgefragte Inhalte können an den eingerichteten KI-Anbieter gehen.'
        : 'Direkte Suche und Freigaben verfügbar. Freie Aufträge nutzen den eingerichteten KI-Anbieter.';
      copyText(mode, hint);
      scope.replaceChildren(...data.areas.map(area => option(area.id, area.label)));
      suggestions.replaceChildren(...promptChoices(data.areas).map(([area, label, prompt]) => button(label, () => askQuestion(prompt, area, true))));
      bindCopy(question, (element, { t }) => {
        element.placeholder = t(data.areas.some(area => area.id === 'invoices')
          ? 'Zum Beispiel: Welche Rechnungen sind offen?'
          : 'Zum Beispiel: Sind neue Anfragen eingegangen?');
      });
      actionList.replaceChildren(...data.actions.map((action: WorkspaceActionInfo) => {
        const item = node('li');
        item.append(text('strong', action.label), text('p', action.effect));
        return item;
      }));
      feedback('');
      setBusy(false);
      if (window.matchMedia('(pointer: fine)').matches) question.focus({ preventScroll: true });
    } catch (error) {
      if (!alive) return;
      setBusy(false);
      feedback(error instanceof Error ? error.message : 'Der Arbeitsbereich konnte nicht geladen werden.', true);
      const retry = button('Erneut laden', () => {
        retry.remove();
        void start();
      });
      output.replaceChildren(retry);
      if (root.contains(document.activeElement) || document.activeElement === document.body) retry.focus({ preventScroll: true });
    }
  }
  void start();

  return {
    setCopy(next) {
      copy = next;
      discardDetachedLabels();
      for (const update of labels.values()) update(next);
    },
    dispose() {
      alive = false;
      abort.abort();
      activeQuestion?.abort();
      labels.clear();
      root.replaceChildren();
    }
  };
}
