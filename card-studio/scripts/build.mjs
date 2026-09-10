import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const result=await build({entryPoints:['src/app.js'],bundle:true,minify:true,format:'esm',write:false});
const code=result.outputFiles[0].contents;
const digest=data=>createHash('sha256').update(data).digest('hex').slice(0,12);
for(const id of ['ziling','yuanyao','nangong']){
 const root='../cards/'+id;
 await writeFile(root+'/app.bundle.js',code);
 let page=await readFile(root+'/index.html','utf8');
 page=page.replace(/app\.bundle\.js(?:\?[^\"]*)?/g,'app.bundle.js?v='+digest(code));
 page=page.replace(/style\.css(?:\?[^\"]*)?/g,'style.css?v='+digest(await readFile(root+'/style.css')));
 await writeFile(root+'/index.html',page);
}
console.log('Built all three scene viewers.');
