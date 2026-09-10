import * as THREE from 'three';
import {createPerformance} from './music.mjs';
import {wrapAngle} from './spin.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const stage=document.querySelector('#stage'), loading=document.querySelector('#loading');
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer,composer,root,face,uniforms,config,auto=false,flipped=false,dragging=false;
let targetX=0.015,targetY=-0.08,targetZoom=1,rotationX=targetX,rotationY=targetY;
let last={x:0,y:0},lastTime=0,elapsed=0,performance=null,down=null;
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-5,5,5.65,-5.65,.1,100); camera.position.set(0,0,20); camera.lookAt(0,0,0);
const vertex=`varying vec2 vUv;
void main(){vUv=vec2(uv.x,1.0-uv.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const shared=`precision highp float;
varying vec2 vUv;
uniform float uTime,uFoil,uScale,uDepth,uBgDepth,uSafeScale;
uniform vec2 uSafeOffset;
uniform vec3 uView;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec3 spectrum(float t){t=fract(t);vec3 pink=vec3(.38,.75,.93),yellow=vec3(1.,.84,.54),blue=vec3(.30,.64,.98);if(t<.35)return mix(pink,yellow,t/.35);if(t<.7)return mix(yellow,blue,(t-.35)/.35);return mix(blue,vec3(1.),(t-.7)/.3);}
vec3 overlay(vec3 b,vec3 f){return mix(2.*b*f,1.-2.*(1.-b)*(1.-f),step(vec3(.5),b));}
float inside(vec2 p){return step(0.,p.x)*step(0.,p.y)*step(p.x,1.)*step(p.y,1.);}
vec2 parallax(vec2 p,float s,float d){return (p-.5)*s+.5+uView.xy/max(abs(uView.z),.35)*d*.14;}
float wave(vec2 p){vec2 a=p+uView.xy*2.4;return .5+.5*sin((a.x*.848-a.y*.530)*6.283*.55+7.*noise(a*1.5));}
float star(vec2 p){vec2 q=p*105.,id=floor(q),f=fract(q);float first=9.,second=9.;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(hash(id+g),hash(id+g+43.3));float d=length(g+o-f);if(d<first){second=first;first=d;}else second=min(second,d);}}float edge=1.-smoothstep(.01,.035,second-first);float sparse=step(.90,hash(id+8.8));float twinkle=pow(.5+.5*sin(uTime*1.8+hash(id)*30.+uView.x*27.+uView.y*21.),6.);return edge*sparse*twinkle;}
`;
const fragment=shared+`
uniform sampler2D tSubject,tBackground,tText,tLine;
void main(){
 vec2 uv=vUv;
 vec2 su=parallax(uv,uScale,uDepth)*uSafeScale+uSafeOffset;
 // Yuan Yao and the platform sit between the foreground and far environment.
 float middle=1.-smoothstep(.75,1.4,length((uv-vec2(.285,.51))/vec2(.115,.36)));
 float bgDepth=mix(uBgDepth,uBgDepth*.18,middle);
 vec2 bu=parallax(uv,1.,bgDepth);
 vec4 sub=texture2D(tSubject,clamp(su,0.,1.));sub.a*=inside(su);
 vec3 bg=texture2D(tBackground,clamp(bu,0.,1.)).rgb;
 vec3 foil=spectrum(wave(uv)*.8+noise(uv*5.)*.12);
 float sweep=pow(max(0.,sin((uv.x*.83+uv.y*.35+uView.x*2.4+uView.y*1.2)*6.283)),10.);
 float lum=dot(bg,vec3(.2126,.7152,.0722));
 float strands=smoothstep(.32,.80,lum);
 bg+=foil*strands*sweep*uFoil*.48;
 // Select the original warm metal pixels, leave the skin and cloth uncoated.
 float armor=1.-smoothstep(.25,.39,su.y);
 float warm=smoothstep(.025,.11,sub.r-sub.b)*smoothstep(.22,.65,sub.g)*armor;
 vec3 subject=sub.rgb+vec3(1.,.83,.48)*warm*sweep*uFoil*.46;
 vec3 col=mix(bg,subject,sub.a);
 float line=1.-smoothstep(.06,.25,texture2D(tLine,clamp(su,0.,1.)).r);
 col+=vec3(.65,.86,1.)*line*inside(su)*sub.a*warm*sweep*uFoil*.10;
 col+=vec3(.53,.80,1.)*star(bu)*uFoil*.06*(1.-sub.a)*strands;
 vec4 text=texture2D(tText,uv);col=mix(col,text.rgb,text.a);
 gl_FragColor=vec4(pow(max(col,vec3(0.)),vec3(2.2)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
const edgeFragment=shared+`void main(){vec3 col=mix(vec3(.22,.29,.36),spectrum(wave(vUv)),.18+uFoil*.22);gl_FragColor=vec4(col*.8+.14,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const backFragment=shared+`uniform sampler2D tBack;
void main(){vec4 art=texture2D(tBack,vec2(1.0-vUv.x,vUv.y));vec2 p=vUv-.5;float filigree=.5+.5*sin(length(p*vec2(1.,1.5))*100.+noise(p*15.)*4.);vec3 col=mix(vec3(.025,.042,.064),vec3(.085,.092,.11),filigree*.35);float border=step(.465,max(abs(p.x),abs(p.y)));col=mix(col,spectrum(wave(vUv))*.55,border);col+=spectrum(wave(vUv))*uFoil*.08;col=mix(col,art.rgb,art.a);gl_FragColor=vec4(pow(col,vec3(2.2)),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
function backTexture(){
 const c=document.createElement('canvas');c.width=1672;c.height=941;const ctx=c.getContext('2d');
 ctx.strokeStyle='#708d9a';ctx.lineWidth=1.5;ctx.strokeRect(44,44,1584,853);ctx.strokeStyle='#344958';ctx.strokeRect(53,53,1566,835);
 ctx.save();ctx.translate(836,402);ctx.strokeStyle='#547685';ctx.lineWidth=1;
 for(let j=0;j<25;j++){ctx.beginPath();for(let k=0;k<=110;k++){const y=-215+k*4;const x=Math.sin(y*.013+j*.23)*30+(j-12)*7*(.5+Math.abs(y)/170);if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}ctx.restore();
 ctx.textAlign='center';ctx.fillStyle='#e7e7da';ctx.font='76px "Songti SC",STSong,serif';ctx.fillText(config.title,836,650);
 ctx.fillStyle='#b8c6c9';ctx.font='28px "Songti SC",serif';ctx.fillText(config.subtitle,836,710);
 ctx.font='19px "PingFang SC",sans-serif';ctx.fillStyle='#8499a6';ctx.fillText('凡人修仙传 · 外海风云12 · 第136集',836,805);
 ctx.font='16px Georgia';ctx.fillText('No.002   /   PRIVATE COLLECTION',836,853);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.NoColorSpace;return tex;
}
async function init(){
 config=await fetch('./card-config.json').then(r=>{if(!r.ok)throw Error('找不到卡牌配置');return r.json();});
 document.title=config.title+' · 幻光典藏';for(const [id,key]of Object.entries({'card-title':'title','collection':'collection','subtitle':'subtitle','description':'description','tagline':'tagline','technique':'technique','edition':'edition'}))if(config[key])$(id).textContent=config[key];
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setClearColor(0x000000,1);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;stage.append(renderer.domElement);
 composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(720,1000),.18,.35,1.0));composer.addPass(new OutputPass());
 const loader=new THREE.TextureLoader();const names=['subject','background','text','lineart'];const textures=await Promise.all(names.map(name=>loader.loadAsync(config.assets[name])));textures.forEach(t=>{t.colorSpace=THREE.NoColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);});
 const prm=config.parameters||{};uniforms={tSubject:{value:textures[0]},tBackground:{value:textures[1]},tText:{value:textures[2]},tLine:{value:textures[3]},tBack:{value:backTexture()},uTime:{value:0},uView:{value:new THREE.Vector3(0,0,1)},uFoil:{value:prm.foil??.65},uScale:{value:prm.subjectScale??1.25},uDepth:{value:prm.subjectDepth??.4},uBgDepth:{value:prm.backgroundDepth??-.25},uSafeScale:{value:config.safeArea?.scale??1.12},uSafeOffset:{value:new THREE.Vector2(...(config.safeArea?.offset??[-.06,-.085]))}};
 const frontMat=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,side:THREE.FrontSide});const edgeMat=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:edgeFragment});const backMat=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:backFragment});const goldMat=new THREE.MeshBasicMaterial({color:0x9fafbc});
 const gltf=await new GLTFLoader().loadAsync(config.assets.model);root=new THREE.Group();root.add(gltf.scene);scene.add(root);
 gltf.scene.traverse(ob=>{if(!ob.isMesh)return;const role=ob.material?.name;if(role==='web_front'){ob.material=frontMat;face=ob;}else if(role==='web_back')ob.material=backMat;else if(role==='web_gold')ob.material=goldMat;else if(role==='web_text')ob.visible=false;else ob.material=edgeMat;});
 if(!face)throw Error('Blender 模型中缺少 web_front 材质，请重新导出模型。');
 performance=createPerformance({pose:()=>({x:rotationX,y:rotationY}),begin:()=>{setAuto(false);dragging=false;flipped=false;$('flip').innerHTML='翻看背面 <span>↻</span>';$('view-label').textContent='IN MOTION · 流转';},finish:()=>{$('view-label').textContent='FRONT · 此刻定格';}});
 setupControls();new ResizeObserver(resize).observe(stage);resize();loading.remove();
 window.__holo={ready:true,config,renderer,root,uniforms,reset,modelSource:config.assets.model};renderer.setAnimationLoop(animate);
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h||!renderer)return;const aspect=w/h;const halfH=Math.max(3.35,5.55/aspect)/targetZoom;camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);}
function setAuto(value){auto=value;$('auto').setAttribute('aria-pressed',String(auto));$('auto').innerHTML=auto?'<span>Ⅱ</span> 暂停赏卡':'<span>▷</span> 自动赏卡';}
function interrupt(){if(!performance?.active)return;performance.cancel();rotationY=wrapAngle(rotationY);targetY=rotationY;targetX=rotationX;flipped=Math.cos(rotationY)<0;}
function reset(){interrupt();targetX=.015;targetY=-.08;targetZoom=1;$('flip').innerHTML='翻看背面 <span>↻</span>';flipped=false;setAuto(false);$('view-label').textContent='FRONT · 正面';resize();}
function flip(){interrupt();flipped=!flipped;setAuto(false);targetY=flipped?Math.PI:0;targetX=0;$('flip').innerHTML=flipped?'回到正面 <span>↻</span>':'翻看背面 <span>↻</span>';$('view-label').textContent=flipped?'BACK · 背面':'FRONT · 正面';}
function setupControls(){
 for(const [id,name,label] of [['foil','uFoil','foil-value'],['scale','uScale','scale-value'],['depth','uDepth','depth-value'],['bg-depth','uBgDepth','bg-depth-value']]){const input=$(id);input.value=uniforms[name].value;const update=()=>{uniforms[name].value=Number(input.value);$(label).value=id==='foil'?Math.round(input.value*100)+'%':Number(input.value).toFixed(2);};input.addEventListener('input',update);update();}
 stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;interrupt();dragging=true;setAuto(false);down={x:e.clientX,y:e.clientY};last={x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId);stage.focus({preventScroll:true});});
 stage.addEventListener('pointermove',e=>{if(!dragging)return;const base=flipped?Math.PI:0;targetY=THREE.MathUtils.clamp(targetY+(e.clientX-last.x)*.006,base-.38,base+.38);targetX=THREE.MathUtils.clamp(targetX+(e.clientY-last.y)*.005,-.23,.23);last={x:e.clientX,y:e.clientY};});
 const up=()=>{dragging=false;down=null;};stage.addEventListener('pointerup',e=>{const tap=down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6;up();if(tap)performance.start();});stage.addEventListener('pointercancel',up);stage.addEventListener('lostpointercapture',up);
 stage.addEventListener('wheel',e=>{e.preventDefault();targetZoom=THREE.MathUtils.clamp(targetZoom-e.deltaY*.001,.82,1.18);resize();},{passive:false});
 stage.addEventListener('keydown',e=>{
  if(e.key===' '){e.preventDefault();performance.start();return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','f','F','r','R'].includes(e.key))return;
  e.preventDefault();interrupt();setAuto(false);
  if(e.key.toLowerCase()==='f'){flip();return;}if(e.key.toLowerCase()==='r'){reset();return;}
  const base=flipped?Math.PI:0;
  if(e.key==='ArrowLeft')targetY-=.07;if(e.key==='ArrowRight')targetY+=.07;if(e.key==='ArrowUp')targetX-=.06;if(e.key==='ArrowDown')targetX+=.06;
  targetY=THREE.MathUtils.clamp(targetY,base-.38,base+.38);targetX=THREE.MathUtils.clamp(targetX,-.23,.23);
 });
 $('auto').onclick=()=>{interrupt();if(flipped)flip();setAuto(!auto);};$('flip').onclick=flip;$('reset').onclick=reset;
 $('save').onclick=()=>{try{composer.render();renderer.domElement.toBlob(blob=>{if(!blob){$('save').textContent='保存失败，请重试';return;}const url=URL.createObjectURL(blob);const a=document.createElement('a');a.download=(config.title||'card')+'-holographic.png';a.href=url;document.body.append(a);a.click();a.remove();$('save').textContent='图片已生成 ✓';setTimeout(()=>{URL.revokeObjectURL(url);$('save').textContent='保存此刻 ↗';},5000);},'image/png');}catch(e){$('save').textContent='保存失败，请重试';}};
 $('details').onclick=$('soundless').onclick=()=>$('about').showModal();$('about').querySelector('.close').onclick=()=>$('about').close();
}
function animate(now){
 const dt=Math.min((now-lastTime)/1000,.1)||0;lastTime=now;
 if(!document.hidden&&!performance?.frozen)elapsed+=dt;
 const frame=performance?.frame();
 if(frame){rotationX=frame.x;rotationY=frame.y;targetX=rotationX;targetY=rotationY;}
 else {
  if(auto){targetY=Math.sin(elapsed*.45)*.24;targetX=Math.sin(elapsed*.6)*.075;}
  const ease=reduced?1:1-Math.exp(-dt*8);rotationX+=(targetX-rotationX)*ease;rotationY+=(targetY-rotationY)*ease;
 }
 root.rotation.set(rotationX,rotationY,0);root.updateMatrixWorld(true);
 uniforms.uView.value.copy(camera.position).applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert()).normalize();
 if(frame)uniforms.uTime.value=frame.time;
 else if(!performance?.frozen)uniforms.uTime.value=reduced&&!auto?0:elapsed;
 composer.render();
}
init().catch(error=>{console.error(error);loading.textContent='卡牌暂时无法加载。\n'+error.message+'\n请通过本地服务打开网页，并确认素材已生成。';loading.setAttribute('role','alert');window.__holo={ready:false,error:error.message};});

