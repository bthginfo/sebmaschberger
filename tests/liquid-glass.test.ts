import test from "node:test";
import assert from "node:assert/strict";
import content from "./fixtures/starter-content.json";
import { applyLiquidGlass, defaultLiquidGlass } from "../src/lib/liquid-glass.mjs";
import { liquidGlassSchema, websiteSchema } from "../src/lib/validation";
import type { WebsiteContent } from "../src/lib/types";

test("Liquid Glass preserves authored content and other palettes until explicitly selected", () => {
  const authored = structuredClone(content) as WebsiteContent;
  const original = structuredClone(authored);
  assert.equal(authored.config.theme.aesthetic, undefined);
  const config = applyLiquidGlass(authored.config, { accent: "#ddbbff" });
  const result = websiteSchema.parse({ ...authored, config });
  assert.equal(result.config.theme.aesthetic, "liquid-glass");
  assert.equal(result.config.theme.palettes?.[1]?.accent, "#ddbbff");
  assert.equal(result.config.email, original.config.email);
  assert.deepEqual(authored, original);
  assert.deepEqual(result.pages, websiteSchema.parse(original).pages);
  assert.deepEqual(config.theme.palettes?.[2], original.config.theme.palettes?.[2]);
  assert.equal(config.modules?.scroll3d?.enabled, original.config.modules?.scroll3d?.enabled);
});

test("CMS glass settings validate bounds and reject arbitrary fields", () => {
  assert.deepEqual(liquidGlassSchema.parse(defaultLiquidGlass), defaultLiquidGlass);
  for (const patch of [{ intensity: -1 }, { speed: 101 }, { depth: 200 }, { revealDuration: 2 }, { background: "script" }, { script: "arbitrary" }]) assert.equal(liquidGlassSchema.safeParse({ ...defaultLiquidGlass, ...patch }).success, false);
  const config = applyLiquidGlass((structuredClone(content) as WebsiteContent).config);
  config.theme.glass = { ...defaultLiquidGlass, background: "space", enabled: false, speed: 23 };
  assert.deepEqual(websiteSchema.parse({ ...content, config }).config.theme.glass, config.theme.glass);
});
