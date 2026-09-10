// Each pass eases at both ends; the return keeps a looping wallpaper continuous.
export function sceneMotion(kind, time) {
 const p=(1-Math.cos(time*Math.PI/16))/2;
 if(kind==='rise')return {x:0,y:-.045+.09*p,advance:.65};
 if(kind==='right')return {x:-.05+.10*p,y:0,advance:.60};
 if(kind==='outward')return {x:0,y:0,advance:1.05*(1-p)};
 return {x:0,y:0,advance:.05+1.0*p};
}
