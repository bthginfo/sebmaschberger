import type {EmailTemplates} from './types';

export const defaultEmailTemplates:Required<EmailTemplates>={
  partialRefundSubject:'{brand} · Deine Teilrückerstattung',
  partialRefundBody:'{brand}\n\nWir haben dir für die Bestellung {orderId} insgesamt {refundAmount} erstattet. Der ursprüngliche Gesamtbetrag ist {total}.\n\nDeine übrigen bezahlten Leistungen und Downloadrechte bleiben bestehen. Den aktuellen Stand findest du hier:\n{receiptUrl}',
  orderSubject:'{brand} · Deine Bestellung',
  orderBody:'{brand}\n\nDanke für deine Bestellung. Deine Zahlung wurde bestätigt.\nBestellnummer: {orderId}\n\n{items}\nGesamt: {total}\n\nBestellstatus und freigegebene Downloads:\n{receiptUrl}',
  refundSubject:'{brand} · Rückerstattung',
  refundBody:'{brand}\n\nFür deine Bestellung wurde eine Rückerstattung gemeldet. Digitale Download-Zugänge wurden gesperrt.\nBestellnummer: {orderId}\n\n{items}\nUrsprüngliche Bestellsumme: {total}\n\nBestellstatus:\n{receiptUrl}',
  contactSubject:'{brand} · Neue Kontaktanfrage',
  contactBody:'Eine neue Kontaktanfrage ist in der geschützten Website-Verwaltung eingegangen.\n\nEingang: {createdAt}\nAnfrage: {inquiryId}\n\nBitte melden Sie sich in der Website-Verwaltung an, um die Nachricht zu lesen.\n{adminUrl}',
};

/** Plain-text substitutions only. No evaluation, HTML, secrets or arbitrary object lookup. */
export function renderEmailTemplate(template:string,values:Record<string,string>):string{
  return template.replace(/\{([a-zA-Z]+)\}/g,(match,key:string)=>Object.hasOwn(values,key)?values[key]:match);
}
