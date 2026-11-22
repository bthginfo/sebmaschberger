import test from 'node:test';
import assert from 'node:assert/strict';
import { appleRows } from '../src/lib/coaching-portal/apple';
import { addDays, daysBetween, emptyPlan, visiblePlan } from '../src/lib/coaching-portal/model';
import { seedCampaign, updateEarlierDraft } from '../src/lib/search-ads/seed';
import { adsRows, campaignSchema, keywordRows, launchSubset } from '../src/lib/search-ads/model';

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

test('the Search campaign has 100 distinct keywords per group, a 10 euro budget and complete responsive ads', () => {
  const campaign=seedCampaign();
  assert.equal(campaign.groups.length,6);
  assert.ok(campaign.groups.every(group=>group.keywords.length===100));
  assert.equal(campaign.dailyBudget,10);
  assert.ok(campaign.groups.every(group=>group.headlines.length===15 && group.descriptions.length===4));
  assert.equal(keywordRows(campaign).length,601+campaign.negative.length);
  assert.equal(adsRows(campaign).length,7);
  const launch=launchSubset(campaign);
  assert.deepEqual(launch.groups.map(group=>group.id),['online-coaching','personal-training']);
  assert.ok(launch.groups.every(group=>group.keywords.length===8&&group.keywords.every(keyword=>keyword.match==='Exact')));
  assert.equal(keywordRows(launch).length,17+campaign.negative.length);
  assert.equal(adsRows(launch).length,3);
  const edited=structuredClone(campaign);
  edited.groups[0].headlines[0]='a'.repeat(31);
  assert.equal(campaignSchema.safeParse(edited).success,false);
});

test('the revised Search draft expands unchanged groups and preserves custom edits', () => {
  const {launch: _, ...campaign}=seedCampaign();
  campaign.dailyBudget=25;
  campaign.groups=campaign.groups.map(group=>({...group,keywords:group.keywords.slice(0,25)}));
  campaign.groups[0].keywords[0].term='persönliches coaching vor der arbeit';
  const next=updateEarlierDraft({campaign,revision:2,status:'approved',approvedAt:'2026-11-20T10:00:00Z'});
  assert.equal(next.revision,3);
  assert.equal(next.status,'draft');
  assert.equal(next.campaign.dailyBudget,10);
  assert.equal(next.campaign.groups[0].keywords.length,25);
  assert.equal(next.campaign.groups[0].keywords[0].term,'persönliches coaching vor der arbeit');
  assert.ok(next.campaign.groups.slice(1).every(group=>group.keywords.length===100));
  assert.equal(updateEarlierDraft(next),next);
});
