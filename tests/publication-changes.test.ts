import test from "node:test";
import assert from "node:assert/strict";
import content from "./fixtures/starter-content.json";
import { websiteSchema } from "../src/lib/validation";
import { publicationChanges } from "../src/lib/publication-changes";
import { createSection } from "../src/lib/section-library";

test("review resolves a renamed page and reordered sections by identity", () => {
  const published = websiteSchema.parse(content);
  const draft = structuredClone(published);
  const page = draft.pages.find(page => page.slug === "leistungen")!;
  const first = page.sections[0];
  const title = first.content.heading;
  page.slug = "angebot";
  first.content.heading = "Ein neuer Titel";
  page.sections.reverse();
  page.sections.push(createSection("statement"));
  const changes = publicationChanges(published, draft);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].id, page.id);
  assert.deepEqual(changes[0].fields.find(field => field.name === "Seitenadresse"),
    { name: "Seitenadresse", before: "/leistungen", after: "/angebot" });
  assert.deepEqual(changes[0].fields.find(field => field.name === "Überschrift"),
    { name: "Überschrift", before: title, after: "Ein neuer Titel" });
  assert.ok(changes[0].fields.some(field => field.name === "Abschnitt hinzugefügt"));
  assert.ok(changes[0].fields.some(field => field.name === "Reihenfolge der Abschnitte geändert"));
});

test("a private post and a different JSON key order create no public changes", () => {
  const published = websiteSchema.parse(content);
  const draft = structuredClone(published);
  draft.config = Object.fromEntries(Object.entries(draft.config).reverse()) as typeof draft.config;
  draft.posts = [{
    id: "private-post", title: "Privater Beitrag", slug: "privat", status: "draft", excerpt: "", author: "",
    date: "2026-11-13", updatedAt: "2026-11-13T12:00:00.000Z", sections: [],
    seo: { title: "", description: "" },
  }];
  assert.deepEqual(publicationChanges(published, draft), []);
});
