import test from 'node:test';
import assert from 'node:assert/strict';
import { appleRows } from '../src/lib/coaching-portal/apple';
import { addDays, daysBetween, emptyPlan, visiblePlan } from '../src/lib/coaching-portal/model';
import { seedCampaign } from '../src/lib/search-ads/seed';
import { adsRows, campaignSchema, keywordRows } from '../src/lib/search-ads/model';

test('Apple Health import selects a daily step source and merges overlapping asleep intervals', () => {
  const rows=appleRows([
    '<HealthData>',
    '<Record type="HKQuantityTypeIdentifierStepCount" sourceName="Apple Watch" unit="count" value="5000" startDate="2026-10-24 10:00:00 +0200" endDate="2026-10-24 11:00:00 +0200"/>',
    '<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" value="4300" startDate="2026-10-24 10:00:00 +0200" endDate="2026-10-24 11:00:00 +0200"/>',
    '<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="A" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2026-10-24 09:00:00 +0200" endDate="2026-10-24 10:00:00 +0200"/>',
    '<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="B" value="HKCategoryValueSleepAnalysisAsleep" startDate="2026-10-24 09:30:00 +0200" endDate="2026-10-24 10:30:00 +0200"/>',
    '</HealthData>',
  ].join(''), '2026-10-25');
  assert.deepEqual(rows,[{date:'2026-10-24',steps:5000,sleep:90}]);
  assert.equal(addDays('2026-10-24',2),'2026-10-26');
  assert.equal(daysBetween('2026-10-24','2026-10-26'),2);
});

test('the client projection removes disabled plan content', () => {
  const item={id:'d22a072b-2549-4358-9743-ce45ac820cfd',day:1,kind:'resource' as const,title:'Private',text:'test',at:'',minutes:0,media:'',exercises:[],recipe:null,questions:[]};
  const plan=emptyPlan('2026-10-25');
  plan.features.resource=false;
  plan.items=[item];
  assert.equal(visiblePlan(plan).items.length,0);
  assert.equal(plan.items.length,1);
});

test('the Search campaign has exactly 150 distinct keywords and complete responsive ads', () => {
  const campaign=seedCampaign();
  assert.equal(campaign.groups.length,6);
  assert.equal(campaign.groups.flatMap(group=>group.keywords).length,150);
  assert.ok(campaign.groups.every(group=>group.headlines.length===15 && group.descriptions.length===4));
  assert.equal(keywordRows(campaign).length,151+campaign.negative.length);
  assert.equal(adsRows(campaign).length,7);
  const edited=structuredClone(campaign);
  edited.groups[0].headlines[0]='a'.repeat(31);
  assert.equal(campaignSchema.safeParse(edited).success,false);
});
