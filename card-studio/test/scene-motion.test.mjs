import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneMotion} from '../src/scene-motion.mjs';
test('four default camera passes follow the requested directions and stay inside the image',()=>{
 const rise=[sceneMotion('rise',0),sceneMotion('rise',16)];assert.ok(rise[1].y>rise[0].y);
 const right=[sceneMotion('right',0),sceneMotion('right',16)];assert.ok(right[1].x>right[0].x);
 assert.ok(sceneMotion('inward',16).advance>sceneMotion('inward',0).advance);
 assert.ok(sceneMotion('outward',16).advance<sceneMotion('outward',0).advance);
 for(const kind of ['rise','right','inward','outward'])for(let t=0;t<=64;t+=.13){
  const p=sceneMotion(kind,t),margin=p.advance*.18/2;
  assert.ok(Math.abs(p.x)<=margin+1e-8&&Math.abs(p.y)<=margin+1e-8,'pan does not expose beyond source image');
 }
 for(const kind of ['rise','right','inward','outward'])assert.deepEqual(sceneMotion(kind,0),sceneMotion(kind,32));
});
