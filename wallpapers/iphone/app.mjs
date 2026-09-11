import {normalizeSize} from './presets.mjs';
import {selectVariant,activeCloudLink,fileURL} from './model.mjs';
const $=id=>document.getElementById(id),video=$('preview'),image=$('still'),params=new URLSearchParams(location.hash.slice(1));
let catalog,current,variant,format=['photo','video','live'].includes(params.get('format'))?params.get('format'):'photo';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const initialSize=normalizeSize(params.get('size'));
$('size').replaceChildren(...['auto','classic','iphone17pro','iphone17promax','iphoneair'].map(id=>new Option(id,id)));
$('size').value=['classic','iphone17pro','iphone17promax','iphoneair'].includes(initialSize)?initialSize:'auto';
const mb=n=>(n/1024/1024).toFixed(1)+' MB';
function permalink(){const p=new URLSearchParams({scene:current.id,size:$('size').value,format});return location.origin+location.pathname+'#'+p;}
function updateFormat(){
 document.querySelectorAll('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===format)));
 $('format-note').textContent={photo:'包含标题与副标题。保存图片到相册后，可设置静态墙纸。',video:'三秒动态光影视频，适合保存和分享；MP4 不能直接设为 iPhone 动态墙纸。',live:'配对原件包。Safari 下载 ZIP 不会自动存成实况照片，也不能直接设为动态墙纸。'}[format];
 const file=variant[format];$('download').href=fileURL(file.url,location.href);$('download').download=current.id+'-'+variant.id+'-'+file.url.split('/').pop();$('download').textContent={photo:'下载静态壁纸 · JPG',video:'下载动态光影 · MP4',live:'下载 Live Photo 原件 · ZIP'}[format];$('download').setAttribute('aria-disabled','false');$('file-size').textContent=mb(file.bytes)+' · '+variant.width+' × '+variant.height;
 const cloud=activeCloudLink(variant.icloud);$('icloud').hidden=!cloud;if(cloud)$('icloud').href=cloud;
 history.replaceState(null,'',permalink());
}
function refresh(){
 const chosen=$('size').value||params.get('size')||'auto';const options=[['auto','自动匹配屏幕比例'],...current.variants.map(v=>[v.id,v.label+' · '+v.width+' × '+v.height])];$('size').replaceChildren(...options.map(([value,label])=>new Option(label,value)));$('size').value=options.some(o=>o[0]===chosen)?chosen:'auto';
 const source=$('source-note');source.replaceChildren();source.hidden=!current.source;if(current.source){const link=document.createElement('a');link.textContent=current.source.label;link.href=current.source.url;link.target='_blank';link.rel='noopener';source.append(link,document.createElement('br'),document.createTextNode(current.source.note));}
 variant=selectVariant(current.variants,$('size').value,screen.width,screen.height);
 $('motion-note').textContent=current.motionDescription||'';
 $('title').textContent=current.title;$('subtitle').textContent=current.subtitle;
 $('size-note').textContent=($('size').value==='auto'?'已按屏幕比例匹配：':'已选择：')+variant.label+'，'+variant.width+' × '+variant.height+'。系统设置墙纸时可微调裁切。';
 document.querySelector('.phone').style.setProperty('--ratio',variant.width+'/'+variant.height);
 video.pause();video.poster=fileURL(variant.photo.url,location.href);video.src=fileURL(variant.video.url,location.href);image.src=video.poster;image.alt=current.title+'，'+current.subtitle;
 video.hidden=false;image.hidden=true;$('play').disabled=false;$('play').textContent='播放光影 ▷';
 document.querySelectorAll('#scenes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===current.id)));
 $('status').textContent='';updateFormat();
 if(!reduced)video.play().catch(()=>{});
}
video.onplay=()=>$('play').textContent='暂停光影 Ⅱ';video.onpause=()=>$('play').textContent='播放光影 ▷';
video.onerror=()=>{image.hidden=false;video.hidden=true;$('play').disabled=true;$('status').textContent='视频暂不可播放，已显示静态预览。下载链接仍可使用。';};
$('play').onclick=()=>video.paused?video.play().catch(()=>{$('status').textContent='播放失败，可下载视频后查看。';}):video.pause();
$('size').onchange=()=>current&&refresh();
document.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>{format=b.dataset.format;if(variant)updateFormat();});
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(permalink());$('status').textContent='已复制链接，对方打开即为当前作品与下载选项。';}catch{$('status').textContent='请复制浏览器地址栏，当前选片已保存在链接中。';}};
try{
 const response=await fetch('./catalog.json',{cache:'no-store'});if(!response.ok)throw Error('下载目录暂不可用');catalog=await response.json();
 if(!Array.isArray(catalog.items)||catalog.items.length===0)throw Error('还没有可下载的作品');
 for(const item of catalog.items){if(!item.variants?.length)continue;const button=document.createElement('button');button.dataset.id=item.id;button.setAttribute('aria-pressed','false');const img=document.createElement('img');img.src=fileURL(item.variants[0].photo.url,location.href);img.alt='';const name=document.createElement('span');name.textContent=item.name;button.append(img,name);button.onclick=()=>{current=item;refresh();};$('scenes').append(button);}
 current=catalog.items.find(i=>i.id===params.get('scene')&&i.variants.length)||catalog.items.find(i=>i.variants.length);if(!current)throw Error('作品导出尚未完成');refresh();$('copy').disabled=false;
}catch(e){$('title').textContent='作品暂未加载';$('status').textContent=e.message+'，请稍后刷新。';}
