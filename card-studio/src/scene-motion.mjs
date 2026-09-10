// Each pass eases at both ends; the return keeps a looping wallpaper continuous.
export function sceneMotion(kind, time) {
 const p=(1-Math.cos(time*Math.PI/16))/2;
 if(kind==='rise')return {x:0,y:-.027+.054*p,advance:.4};
 if(kind==='right')return {x:-.03+.06*p,y:0,advance:.36};
 if(kind==='outward')return {x:0,y:0,advance:.65*(1-p)};
 return {x:0,y:0,advance:.05+.6*p};
}
