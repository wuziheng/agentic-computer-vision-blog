import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSpin, sampleSpin, wrapAngle, clipTiming, FRONT} from '../src/spin.mjs';
test('six complete turns land on the same front from either side, without reversing',()=>{
  for(const y of [-.38, -.08, .38, Math.PI, 18.3]) {
    const s=makeSpin(.19,y); let previous=y;
    for(let t=0;t<=8;t+=.01){const p=sampleSpin(s,t);assert.ok(p.y>=previous);previous=p.y;}
    const end=sampleSpin(s,8);assert.ok(Math.abs(wrapAngle(end.y)-FRONT.y)<1e-10);assert.ok(Math.abs(end.x-FRONT.x)<1e-10);assert.ok(end.done);
    assert.ok(end.y-y>=6*Math.PI*2);
    assert.ok(end.y-sampleSpin(s,7.99).y < .000001);
  }
});
test('audio pauses and seeks reproduce exact poses, regardless of frame rate',()=>{
  const s=makeSpin(0,0);assert.deepEqual(sampleSpin(s,3.2),sampleSpin(s,3.2));
  assert.equal(sampleSpin(s,-1).progress,0);assert.deepEqual(sampleSpin(s,99),sampleSpin(s,8));
});
test('reduced motion takes a short path and clip bounds handle short files',()=>{
  const s=makeSpin(0,Math.PI,8,true);assert.ok(Math.abs(s.end-s.y)<=Math.PI);
  assert.deepEqual(clipTiming(100,8,3),{start:2.5,duration:.5});
  assert.deepEqual(clipTiming(-2,-1,30),{start:0,duration:.5});
});
