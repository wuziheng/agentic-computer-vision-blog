export function selectVariant(variants,selected,screenWidth,screenHeight){
 if(!variants?.length)throw Error('该作品尚未生成下载文件');
 if(selected!=='auto')return variants.find(v=>v.id===selected)||variants[0];
 const ratio=Math.min(screenWidth,screenHeight)/Math.max(screenWidth,screenHeight);
 if(!Number.isFinite(ratio)||ratio<=0)return variants[0];
 return [...variants].sort((a,b)=>Math.abs(a.width/a.height-ratio)-Math.abs(b.width/b.height-ratio))[0];
}
export function activeCloudLink(link,now=Date.now()){
 if(!link?.url||!Number.isFinite(Date.parse(link.expiresAt))||Date.parse(link.expiresAt)<=now)return null;
 try{const u=new URL(link.url);return u.protocol==='https:'&&u.hostname==='www.icloud.com'&&u.pathname.startsWith('/photos/')?u.href:null;}catch{return null;}
}
export function fileURL(value,base){
 const u=new URL(value,base),b=new URL(base);
 if(u.origin!==b.origin||!u.pathname.startsWith(new URL('.',base).pathname)||!/^https?:$/.test(u.protocol))throw Error('下载地址无效');
 return u.href;
}
