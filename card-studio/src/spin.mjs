import {Quaternion, Euler, Vector3} from 'three';
export const TAU=Math.PI*2;
export const FRONT={x:.015,y:-.08};
const Z=new Vector3(0,0,1),Y=new Vector3(0,1,0);
const frontQuaternion=()=>new Quaternion().setFromEuler(new Euler(FRONT.x,FRONT.y,0));
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*x*(x*(x*6-15)+10);};
export function wrapAngle(angle){return Math.atan2(Math.sin(angle),Math.cos(angle));}

// Pick the impulse once. Re-sampling an audio time never adds fresh randomness.
export function makeSpin(pose,duration=8,reduced=false,seed=Math.random()){
 const turns=6+Math.floor(seed*3),phase=seed*TAU;
 const steps=1024,travel=new Float64Array(steps+1);
 for(let i=1;i<=steps;i++){
  const p=(i-.5)/steps,u=Math.max(0,(p-.035)/.965);
  const speed=(1-Math.exp(-u/.018))*(1-u)**2*(1+.075*Math.sin(u*TAU*2.7+phase)+.035*Math.sin(u*TAU*6.3+phase*1.7));
  travel[i]=travel[i-1]+speed/steps;
 }
 const total=travel[steps];for(let i=0;i<=steps;i++)travel[i]/=total;
 return {quaternion:pose.quaternion.slice(),position:(pose.position||[0,0,0]).slice(),scale:pose.scale??1,duration,reduced,seed,phase,turns,travel};
}
export function sampleSpin(spin,seconds){
 const p=clamp(seconds/spin.duration),time=p*spin.duration;
 const base=new Quaternion().fromArray(spin.quaternion).slerp(frontQuaternion(),smooth(0,spin.reduced?1:.30,p));
 let quaternion=base,position=spin.position.map(v=>v*(1-smooth(0,.3,p))),scale=1+(spin.scale-1)*(1-smooth(0,.3,p));
 if(!spin.reduced&&p>0&&p<1){
  const at=p*(spin.travel.length-1),index=Math.floor(at),fraction=at-index;
  const travel=spin.travel[index]+(spin.travel[index+1]-spin.travel[index])*fraction;
  const roll=TAU*spin.turns*travel;
  // The coin's normal traces a changing cone. Its in-plane spin is independent
  // of precession, so neither the front nor the edge repeats a rigid Y-axis flip.
  const precession=spin.phase+TAU*((.48+spin.seed*.18)*p+2.1*p*p+.8*p**4);
  const kick=smooth(0,.10,p),decay=1-smooth(.22,1,p);
  const tilt=(1.50+spin.seed*.20)*kick*decay*(1+.13*Math.sin(precession*1.63+spin.phase)+.055*Math.sin(precession*.71));
  const afterRock=.07*Math.sin(precession*1.4)*smooth(.60,.78,p)*(1-smooth(.80,1,p));
  const cone=new Quaternion().setFromAxisAngle(Z,precession)
   .multiply(new Quaternion().setFromAxisAngle(Y,tilt))
   .multiply(new Quaternion().setFromAxisAngle(Z,roll-precession+afterRock));
  quaternion=base.multiply(cone).normalize();
  const orbit=kick*decay;
  position[0]+=.25*orbit*Math.cos(precession+.3);
  position[1]+=.13*orbit*Math.sin(precession*.83)+.10*Math.sin(Math.PI*p)**2;
  const distanceScale=.57+.43*smooth(.73,1,p);
  scale=spin.scale+(distanceScale-spin.scale)*smooth(0,.060,p);
 }
 if(p===1){quaternion=frontQuaternion();position=[0,0,0];scale=1;}
 return {quaternion:quaternion.toArray(),position,scale,progress:p,time,done:p===1,
  phase:p===1?'定格 · 你只管做你想做的':p<.42?'掷光 · 自旋':p<.82?'摇曳 · 缓落':'余晃 · 收藏此刻'};
}
export function clipTiming(start,duration,mediaDuration){
 const total=Number.isFinite(mediaDuration)?Math.max(.1,mediaDuration):30;
 const offset=Math.max(0,Math.min(Number(start)||0,Math.max(0,total-.5)));
 return {start:offset,duration:Math.min(30,Math.max(.5,Number(duration)||8),total-offset)};
}
