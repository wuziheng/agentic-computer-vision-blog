/** Per-scene light is added behind the foreground alpha, so particles never paint over faces. */
export function sceneFragment(shared) { return shared+`
uniform sampler2D tSubject,tBackground,tText,tLine;
uniform float uScene;
uniform vec3 uAccent;
vec3 fireworks(vec2 uv){
 vec3 light=vec3(0.);
 for(int i=0;i<4;i++){
  float n=float(i),life=mod(uTime*.7+n*1.43,5.8),cycle=floor((uTime*.7+n*1.43)/5.8);
  vec2 center=vec2(.26+hash(vec2(n,cycle))*.53,.64+hash(vec2(cycle+3.,n+2.))*.25);
  vec2 d=(uv-center)*vec2(1.7778,1.);d.y+=life*life*.006;
  float radius=.014+.17*(1.-exp(-life*1.7)),r=length(d),angle=atan(d.y,d.x);
  float ray=pow(.5+.5*cos(angle*(34.+n*6.)+n),32.);
  float head=exp(-pow((r-radius)/.004,2.));
  float trail=exp(-abs(r-radius*.78)/.042)*smoothstep(radius*.35,radius*.85,r);
  float fade=smoothstep(0.,.13,life)*(1.-smoothstep(1.3,3.1,life));
  float shimmer=.7+.3*sin(angle*83.+life*16.);
  light+=(vec3(1.,.52,.12)*trail*.90+vec3(1.,.85,.52)*head*2.2)*ray*fade*shimmer;
 }
 return light*smoothstep(.43,.56,uv.y);
}
void main(){
 vec2 uv=vUv,su=parallax(uv,uScale,uDepth)*uSafeScale+uSafeOffset,bu=parallax(uv,1.,uBgDepth);
 if(uScene>1.5&&uScene<2.5){
  su=(uv-vec2(.5,.06))*(uScale-uAdvance*.20)+vec2(.5,.06);
  bu=(uv-.5)*(1.-uAdvance*.038)+.5;
 }
 vec4 sub=texture2D(tSubject,clamp(su,0.,1.));sub.a*=inside(su);
 vec3 bg=texture2D(tBackground,clamp(bu,0.,1.)).rgb;
 float lum=dot(bg,vec3(.2126,.7152,.0722));
 float sweep=pow(max(0.,sin((uv.x*.83+uv.y*.35+uView.x*2.4+uView.y*1.2+uTime*.026)*6.283)),10.);
 vec3 fx=vec3(0.);
 if(uScene<1.5){
  float pulse=pow(.5+.5*sin(bu.x*72.+sin(bu.x*17.)*4.-bu.y*2.+uTime*.6),12.);
  float runes=smoothstep(.45,.85,lum);
  fx=uAccent*(runes*(pulse*.27+sweep*.20)+star(bu+vec2(0.,uTime*.004))*.10);
  bg*=.98;
 }else if(uScene<2.5){
  fx=fireworks(bu)+vec3(1.,.68,.31)*star(bu)*.05;
 }else{
  float halo=exp(-pow(length((bu-vec2(.53,.62))*vec2(1.4,1.))-.38,2.)*18.);
  fx=uAccent*(halo*(.5+.5*sin(uTime*.6))*.038+star(bu+vec2(uTime*.0005,0.))*.11);
  bg*=.91;
 }
 bg+=fx*uFoil;
 // Glint only on bright, lower costume regions. Sparse registered lines remain subdued.
 float costume=1.-smoothstep(.28,.43,su.y);
 float shine=smoothstep(.35,.86,dot(sub.rgb,vec3(.2126,.7152,.0722)))*costume;
 float lines=1.-smoothstep(.08,.32,texture2D(tLine,clamp(su,0.,1.)).r);
 vec3 person=sub.rgb+uAccent*sweep*uFoil*shine*(.13+lines*.035);
 vec3 col=mix(bg,person,sub.a);
 vec4 label=texture2D(tText,uv);col=mix(col,label.rgb,label.a);
 gl_FragColor=vec4(pow(max(col,vec3(0.)),vec3(2.2)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`; }
