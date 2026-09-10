import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Euler,Vector3} from 'three';
import {makeSpin,sampleSpin,clipTiming,FRONT} from '../src/spin.mjs';
const front=new Quaternion().setFromEuler(new Euler(FRONT.x,FRONT.y,0));
const pose=(x=0,y=0,z=0)=>({quaternion:new Quaternion().setFromEuler(new Euler(x,y,z)).toArray(),position:[0,0,0],scale:1});
const q=frame=>new Quaternion().fromArray(frame.quaternion);
test('coin motion starts at the current pose and settles smoothly on the front',()=>{
 for(const initial of [pose(),pose(.19,Math.PI,.2),{...pose(.7,1.3,-2),position:[.2,-.1,0],scale:.6}]){
  const spin=makeSpin(initial,8,false,.37);
  assert.ok(q(sampleSpin(spin,0)).angleTo(new Quaternion().fromArray(initial.quaternion))<1e-7);
  assert.deepEqual(sampleSpin(spin,0).position,initial.position);assert.equal(sampleSpin(spin,0).scale,initial.scale);
  const end=sampleSpin(spin,8);assert.ok(q(end).angleTo(front)<1e-7);assert.deepEqual(end.position,[0,0,0]);assert.equal(end.scale,1);assert.ok(end.done);
  assert.ok(q(sampleSpin(spin,7.999)).angleTo(q(end))<1e-6);
 }
});
test('precession changes both tilt axes and seed varies the impulse without frame jitter',()=>{
 const a=makeSpin(pose(),8,false,.12),b=makeSpin(pose(),8,false,.78);
 assert.deepEqual(sampleSpin(a,3.2),sampleSpin(a,3.2));assert.notDeepEqual(sampleSpin(a,3.2).quaternion,sampleSpin(b,3.2).quaternion);
 const normals=[.15,.3,.48,.6].map(p=>new Vector3(0,0,1).applyQuaternion(q(sampleSpin(a,p*8))));
 assert.ok(Math.max(...normals.map(n=>n.x))-Math.min(...normals.map(n=>n.x))>.4);
 assert.ok(Math.max(...normals.map(n=>n.y))-Math.min(...normals.map(n=>n.y))>.4);
 assert.deepEqual(sampleSpin(a,100),sampleSpin(a,8));
});
test('card corners stay in the default stage throughout launch, spin and settling',()=>{
 for(const seed of [.02,.29,.51,.78,.99]){
  const spin=makeSpin(pose(FRONT.x,FRONT.y),8,false,seed);
  for(let i=0;i<=800;i++){
   const f=sampleSpin(spin,i/100);assert.ok(Math.abs(q(f).length()-1)<1e-9);
   for(const x of [-4.8,4.8])for(const y of [-2.7,2.7]){
    const corner=new Vector3(x,y,0).multiplyScalar(f.scale).applyQuaternion(q(f)).add(new Vector3(...f.position));
    assert.ok(Math.abs(corner.y)<3.35,`vertical clipping at ${i/100}s, seed ${seed}: ${corner.y}`);
    assert.ok(Math.abs(corner.x)<5.55);
   }
  }
 }
});
test('replay preserves a tumbling pose, reduced motion avoids loops, short audio is bounded',()=>{
 const original=makeSpin(pose(),8,false,.4),mid=sampleSpin(original,2.3),replay=makeSpin(mid,8,false,.8);
 assert.ok(q(sampleSpin(replay,0)).angleTo(q(mid))<1e-7);assert.deepEqual(sampleSpin(replay,0).position,mid.position);
 const reduced=makeSpin(pose(0,Math.PI),8,true,.2);
 const angles=[0,2,4,6,8].map(t=>q(sampleSpin(reduced,t)).angleTo(front));
 assert.ok(angles.every((angle,i)=>i===0||angle<=angles[i-1]));
 assert.deepEqual(clipTiming(100,8,3),{start:2.5,duration:.5});
});
