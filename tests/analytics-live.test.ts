import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildLiveReport,projectLiveSession} from '../src/lib/analytics/live';
import {buildAnalyticsReport} from '../src/lib/analytics/report';
import {defaultAnalyticsFilters,type AnalyticsSession} from '../src/lib/analytics/model';

const now=new Date('2026-11-08T16:03:30.000Z');
function session(id:string,visitor:string,start:string,last:string,path:string):AnalyticsSession{
 return {id,visitor,startedAt:start,updatedAt:last,generation:1,device:'mobile',browser:'Safari',country:'DE',source:'direkt',medium:'',campaign:'',
  pages:[{id:id+'-page',path,enteredAt:start,engagedMs:12000,goals:[]}]};
}

test('the Live view returns only aggregates, deduplicates recent visitors and fences private paths',()=>{
 const sessions=[
  session('first-1','browser-a','2026-11-08T15:42:00.000Z','2026-11-08T16:01:00.000Z','/websites'),
  session('first-2','browser-a','2026-11-08T16:02:00.000Z','2026-11-08T16:03:20.000Z','/tools'),
  session('second','browser-b','2026-11-08T15:40:00.000Z','2026-11-08T16:00:00.000Z','/'),
  session('old','browser-c','2026-11-08T15:35:00.000Z','2026-11-08T15:58:29.000Z','/'),
  session('future','browser-d','2026-11-08T16:04:00.000Z','2026-11-08T16:04:00.000Z','/'),
  session('private','browser-e','2026-11-08T16:00:00.000Z','2026-11-08T16:01:00.000Z','/admin'),
 ].map(projectLiveSession);
 const report=buildLiveReport(true,sessions,now);
 assert.equal(report.visitors,2);
 assert.equal(report.visits,3);
 assert.equal(report.newVisits,1);
 assert.equal(report.activity.reduce((total,bucket)=>total+bucket.visitors,0),2);
 assert.deepEqual(report.pages,[{name:'/',value:1},{name:'/tools',value:1}]);
 assert(!JSON.stringify(report).includes('browser-'));
 assert.equal(buildLiveReport(false,sessions,now).visitors,0);
 assert.equal(buildLiveReport(true,sessions,new Date(+now+360000)).visitors,0);
});

test('daily comparisons, visit depth, returning browsers and page rankings follow the date range',()=>{
 const current1=session('a','browser','2026-11-08T14:00:00.000Z','2026-11-08T14:00:15.000Z','/');
 current1.pages.push({id:'a-2',path:'/websites',enteredAt:'2026-11-08T14:00:06.000Z',engagedMs:9000,goals:[]});
 const current2=session('b','browser','2026-11-08T15:00:00.000Z','2026-11-08T15:00:15.000Z','/websites');
 const previous=session('c','prior','2026-11-07T14:00:00.000Z','2026-11-07T14:00:15.000Z','/');
 const report=buildAnalyticsReport([current1,current2,previous],{...defaultAnalyticsFilters(now),from:'2026-11-08'},90,now);
 assert.equal(report.current.visitors,1);
 assert.equal(report.current.returningVisitors,1);
 assert.equal(report.current.visitDepth,1.5);
 assert.equal(report.days[0].previousVisits,1);
 assert.deepEqual(report.exits,[{name:'/websites',value:2}]);
 assert.equal(report.entries.length,2);
});
