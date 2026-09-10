import {makeSpin, sampleSpin, clipTiming} from './spin.mjs';

export function createPerformance({pose, begin, finish}) {
  const $=id=>document.getElementById(id), audio=$('soundtrack');
  let run=null, request=0, objectURL=null, frozen=false, phase='';
  const say=text=>{$('music-status').textContent=text;};
  const buttons=()=>{
    $('spin').textContent=run ? '↻ 重新入画' : '✧ 旋转入画';
    $('pause-music').disabled=!run;
    $('pause-music').textContent=audio.paused?'继续':'暂停';
  };
  function cancel(message='已停止，可重新入画') {
    request++;run=null;frozen=false;audio.pause();buttons();say(message);
    $('spin-progress').value=0;$('spin-phase').textContent='点击入画 · 随乐流转';
  }
  async function start() {
    const ticket=++request;
    audio.pause();
    const timing=clipTiming($('clip-start').value,$('clip-duration').value,audio.duration);
    $('clip-start').value=timing.start;$('clip-duration').value=timing.duration;
    const current=pose();
    run={...makeSpin(current.x,current.y,timing.duration,matchMedia('(prefers-reduced-motion: reduce)').matches),start:timing.start};
    frozen=false;phase='';begin();buttons();say('正在准备配乐…');
    try {
      audio.currentTime=timing.start;
      await audio.play();
      if(ticket!==request)return;
      say('声画同步 · 配乐播放中');buttons();
    } catch(error) {
      if(ticket!==request)return;
      run=null;buttons();say('音乐未能播放，请再次点击，或换一首本地音频。');
    }
  }
  $('spin').onclick=start;
  $('pause-music').onclick=()=>{
    if(audio.paused)audio.play().catch(()=>say('请点击下方播放器继续播放。'));
    else audio.pause();
  };
  for(const event of ['play','pause','playing','waiting','ended'])audio.addEventListener(event,()=>{
    buttons();
    if(!run)return;
    say(event==='waiting'?'配乐缓冲中 · 画面同步等待':event==='pause'?'已暂停 · 声画停在同一刻':event==='ended'?'配乐结束': '声画同步 · 配乐播放中');
  });
  audio.addEventListener('error',()=>{cancel('音频无法读取，请换一首 MP3、M4A 或 WAV。');});
  audio.volume=.55;
  $('music-file').addEventListener('change',()=>{
    const file=$('music-file').files[0];if(!file)return;
    if(file.size>80*1024*1024){say('请选择 80 MB 以内的音频。');return;}
    cancel();if(objectURL)URL.revokeObjectURL(objectURL);
    objectURL=URL.createObjectURL(file);audio.src=objectURL;audio.load();
    $('track-name').textContent=file.name;$('track-note').textContent='本机音频 · 文件留在你的设备上';
    $('clip-start').value=0;say('音频已选择，点击旋转入画即可同步播放。');
  });
  $('demo-music').onclick=()=>{
    cancel();if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
    audio.src='./assets/quiet-promise.wav';audio.load();$('clip-start').value=0;$('clip-duration').value=8;
    $('track-name').textContent='此刻 · 氛围小样';$('track-note').textContent='临时合成配乐 · 非动画原曲';say('已切回示范配乐');
  };
  for(const id of ['clip-start','clip-duration'])$(id).addEventListener('change',()=>cancel('片段已调整，点击旋转入画试听。'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&run&&!audio.paused)audio.pause();});
  window.addEventListener('pagehide',()=>audio.pause());
  return {start,cancel,get active(){return !!run;},get frozen(){return frozen;},
    frame(){
      if(!run)return null;
      const state=sampleSpin(run,audio.currentTime-run.start);
      $('spin-progress').value=state.progress;
      if(state.phase!==phase){phase=state.phase;$('spin-phase').textContent=phase;}
      if(state.done&&!frozen){frozen=true;finish();}
      if(!state.done){if(frozen)begin();frozen=false;}
      return state;
    }
  };
}
