import test from 'node:test';import assert from 'node:assert/strict';
import {meters,bearing,projectSegment,polylineMetrics,locateOnLine,formatDistance,formatTime,parseDestinationQuery,compactRoute,navigationProgress,maneuverText,normalizeHeading} from '../nav-core.mjs';
test('distance / bearing nearby locations',()=>{const a=[8,52],b=[8.001,52];assert.ok(meters(a,b)>60&&meters(a,b)<75);assert.ok(Math.abs(bearing(a,b)-90)<1)});
test('project onto road segment',()=>{const a=[8,52],b=[8.002,52];const p=projectSegment([8.001,52.0001],a,b);assert.ok(p.t>.4&&p.t<.6);assert.ok(p.distance<20)});
test('route cumulative and snapping',()=>{const pts=[[8,52],[8.001,52],[8.002,52]];const c=polylineMetrics(pts);const r=locateOnLine([8.0015,52.0001],pts,c);assert.ok(r.along>c[1]&&r.along<c[2]);assert.ok(r.distance<20)});
test('units and times',()=>{assert.equal(formatDistance(1250),'1.3 KM');assert.match(formatDistance(1610,'imperial'),/MI/);assert.equal(formatTime(3600),'1h 0m')});
test('share destination parser validation',()=>{assert.equal(parseDestinationQuery('?to=bad'),null);assert.deepEqual(parseDestinationQuery('?to=8.1,52.1&name=Test'),{coords:[8.1,52.1],label:'Test'})});
test('route steps, turn instructions, progress',()=>{const r={geometry:{coordinates:[[8,52],[8.001,52],[8.002,52]]},legs:[{steps:[{maneuver:{location:[8,52],type:'depart'},name:'Start'},{maneuver:{location:[8.002,52],type:'turn',modifier:'right'},name:'Main Street'}]}]};const c=compactRoute(r);const p=navigationProgress(c,[8.001,52]);assert.ok(p.remaining>50);assert.ok(p.turnMeters>50);assert.match(maneuverText(p.upcoming.step),/TURN RIGHT/)});
test('heading normalization',()=>{assert.equal(normalizeHeading(-90),270);assert.equal(normalizeHeading(null),null)});
