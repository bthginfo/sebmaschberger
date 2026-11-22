import assert from "node:assert/strict";
import { test } from "node:test";
import { collectionColumns, collectionLines, moveCollectionItem, withCollectionIds } from "../src/lib/collection-editing";
import { updateDraftAddresses } from "../src/lib/draft-link-addresses";

test("legacy entries retain their new identifiers and settings after sorting", () => {
  const entries = withCollectionIds([{ title: "Same", id: "legacy-2", color: "red" }, { title: "Same", color: "blue" }]);
  assert.notEqual(entries[0].id, entries[1].id);
  const reordered = moveCollectionItem(entries, 0, 1);
  assert.equal(reordered[0], entries[1]);
  assert.equal(reordered[1], entries[0]);
  assert.equal(moveCollectionItem(entries, 0, 4), entries);
});

test("pasted titles ignore empty lines and few items keep useful columns", () => {
  assert.deepEqual(collectionLines("Delivery\r\n\r\n Returns \nContact"), ["Delivery", "Returns", "Contact"]);
  assert.deepEqual([1, 2, 4, 5, 12].map(count => collectionColumns(3, count)), [1, 2, 2, 3, 3]);
});

test("renaming a draft page and anchor preserves exact internal targets and leaves other links alone", () => {
  const before = { id: "store", slug: "store", sections: [{ id: "faq", anchor: "shipping" }] };
  const page = { ...before, slug: "shop", sections: [{ id: "faq", anchor: "delivery" }], primaryHref: "#shipping" };
  const other = { id: "help", slug: "help", sections: [], primaryHref: "#shipping" };
  const draft = { pages: [page, other], config: { navigation: [
    { href: "/store/?mode=gift#shipping", label: "/store/" },
    { href: "/store/archive" }, { href: "https://example.com/store/#shipping" }, { href: "//example.com/store" },
  ] } };
  const result = updateDraftAddresses(draft, before, page);
  assert.equal(result.pages[0].primaryHref, "#delivery");
  assert.equal(result.pages[1], other);
  assert.deepEqual(result.config.navigation[0], { href: "/shop?mode=gift#delivery", label: "/store/" });
  assert.deepEqual(result.config.navigation.slice(1), draft.config.navigation.slice(1));
  assert.equal(draft.pages[0].primaryHref, "#shipping");
});
