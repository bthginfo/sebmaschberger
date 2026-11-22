import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StructuredData } from '../src/components/structured-data';
import source from '../src/data/content.json';
import type { WebsiteContent } from '../src/lib/types';

test('generic structured data preserves text without allowing an editor to terminate the JSON script', () => {
  const content = structuredClone(source) as WebsiteContent;
  content.config.legalName = '</script><img src=x onerror=alert(1)>';
  const html = renderToStaticMarkup(createElement(StructuredData, { page: content.pages[0], site: content.config, base: 'https://example.org' }));
  assert.equal((html.match(/<script\b/g) || []).length, 1);
  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes('\\u003c/script>'), true);
  const data = JSON.parse(html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
  assert.equal(data['@graph'][0]['@type'], 'Organization');
  assert.equal(data['@graph'][0].name, content.config.legalName);
});
