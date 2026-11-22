import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cmsAppearanceCss } from "../src/lib/cms-appearance";
import { cmsAppearanceSchema } from "../src/lib/cms-appearance-schema";
import { advanceMotionProgress } from "../src/lib/motion-progress";

test("authored section and item colors use local typefaces and cannot escape their canvas", () => {
  const saved = cmsAppearanceSchema.parse({ headingTypeface: "playfair-display", buttonBackground: "#0b294a", bodyScale: 1.1 });
  const css = cmsAppearanceCss('test"><style>', [{ id: "main", design: saved, content: {
    items: [{ id: "first", appearance: { buttonBackground: "#663399" } }, { id: "second" }],
  } }]);
  assert.match(css, /font-family:"CMS Playfair Display", serif!important/);
  assert.match(css, /\[data-item-id="first"\].+background-color:#663399/);
  assert(!css.includes("<style>"));
  assert(!css.includes('[data-item-id="second"]'));
  assert(!cmsAppearanceSchema.safeParse({ iconColor: "#fff}a{color:red" }).success);
  assert(!cmsAppearanceSchema.safeParse({ bodyTypeface: "https://fonts.example.invalid" }).success);
});

test("a long native scroll delta and its reversal stay below the visual speed limit", () => {
  const at = advanceMotionProgress(0, 1, 0.2, 1.45);
  assert(at > 0 && at <= 1.45 / 24);
  const reversed = advanceMotionProgress(at, 0, 1 / 60, 1.45);
  assert(reversed < at && at - reversed <= 1.45 / 60);
  let current = 0;
  for (let frame = 0; frame < 140; frame++) current = advanceMotionProgress(current, 1, 1 / 60);
  assert.equal(current, 1);
});
