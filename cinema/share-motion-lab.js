(()=>{'use strict';
const canvas=document.querySelector('#card');
const ctx=canvas.getContext('2d');
const replay=document.querySelector('#replay');
const exportBtn=document.querySelector('#export');
const status=document.querySelector('#status');
const W=1080,H=1350,DURATION=5000,FPS=30;
let raf=0,startAt=0,recording=false,noise=null;
const sampleChoices=['A','B','A','A','B','A','B','A','B','A','A','B','A','B','A','A','B','A'];
let data={code:'IWGC',name:'狙擊手',hook:'候著一直都有，真正值得你出手的，沒有幾個。',color:'#d2b24b'};

const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const phase=(p,a,b)=>smooth((p-a)/(b-a));

function text(s,x,y,font,color,alpha){
  ctx.save();
  ctx.globalAlpha=alpha==null?1:alpha;
  ctx.font=font;
  ctx.fillStyle=color||'#11110f';
  ctx.fillText(s,x,y);
  ctx.restore();
}
function makeNoise(){
  const c=document.createElement('canvas');
  c.width=240;c.height=300;
  const g=c.getContext('2d');
  const img=g.createImageData(c.width,c.height);
  let seed=92381;
  for(let i=0;i<img.data.length;i+=4){
    seed=(seed*1664525+1013904223)>>>0;
    const v=seed/4294967296>.5?255:48;
    img.data[i]=img.data[i+1]=img.data[i+2]=v;
    img.data[i+3]=3+(seed%8);
  }
  g.putImageData(img,0,0);
  return c;
}
function wrap(str,maxWidth,font){
  ctx.font=font;
  const out=[];let line='';
  for(const ch of Array.from(str)){
    if(line&&ctx.measureText(line+ch).width>maxWidth){out.push(line);line=ch}
    else line+=ch;
  }
  if(line)out.push(line);
  return out;
}
function paper(){
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#f8f4ea');
  g.addColorStop(.55,'#f1ece1');
  g.addColorStop(1,'#ded7c8');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);
  if(!noise)noise=makeNoise();
  ctx.save();
  ctx.globalAlpha=.4;
  ctx.drawImage(noise,0,0,W,H);
  ctx.restore();
}
function reliefY(t,b){
  const vals=sampleChoices.map(x=>x==='A'?1:-1);
  const u=t*17,i=Math.min(16,Math.floor(u)),f=u-i,s=f*f*(3-2*f);
  const v=vals[i]*(1-s)+vals[i+1]*s;
  const mound=Math.pow(Math.sin(Math.PI*t),1.15);
  return 905+b*8.2-Math.sin(t*Math.PI*2.25+.7)*105*mound-v*42*mound+Math.cos(t*7+b*.035)*8;
}
function drawRelief(progress){
  ctx.save();
  ctx.beginPath();
  ctx.rect(0,700,W*progress,330);
  ctx.clip();
  for(let b=-16;b<=16;b++){
    ctx.beginPath();
    for(let k=0;k<=190;k++){
      const t=k/190,x=-70+t*(W+140),y=reliefY(t,b);
      if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    const shade=ctx.createLinearGradient(0,700,W,1020);
    shade.addColorStop(0,'#aaa392');
    shade.addColorStop(.28,'#6f6a5d');
    shade.addColorStop(.5,'#e9e3d7');
    shade.addColorStop(.72,'#8b8578');
    shade.addColorStop(1,'#c5bdad');
    ctx.strokeStyle=shade;
    ctx.lineWidth=3.4;
    ctx.stroke();
    ctx.save();
    ctx.translate(0,-1.8);
    ctx.strokeStyle='rgba(255,255,255,.62)';
    ctx.lineWidth=1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function draw(p){
  ctx.clearRect(0,0,W,H);
  paper();
  const pad=76;

  ctx.fillStyle=data.color||'#d2b24b';
  ctx.fillRect(0,0,7,H);

  text('82TRADE',pad,78,'800 27px Arial','#11110f',1);
  ctx.textAlign='right';
  text('TRADER DNA / IDENTITY EDITION',W-pad,76,'13px ui-monospace','#67635b',1);
  ctx.textAlign='left';
  ctx.fillStyle='#33322d30';
  ctx.fillRect(pad,109,W-pad*2,1);

  text('YOUR TRADER DNA',pad,169,'14px ui-monospace','#6b675f',phase(p,.02,.18));

  const dna=phase(p,.08,.30);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0,195,W*dna,270);
  ctx.clip();
  ctx.translate(0,(1-dna)*26);
  text(data.code,pad-8,415,'900 263px Arial','#10100e',.98);
  ctx.restore();

  const nameP=phase(p,.22,.42);
  text(data.name,pad,510,'700 66px "Songti TC","Noto Serif CJK TC",serif','#11110f',nameP);
  ctx.save();
  ctx.globalAlpha=nameP;
  ctx.fillStyle=data.color||'#d2b24b';
  ctx.fillRect(pad,542,98,5);
  ctx.restore();

  const hookP=phase(p,.30,.52);
  const hookFont='34px "PingFang TC","Noto Sans CJK TC",sans-serif';
  wrap(data.hook,560,hookFont).slice(0,2).forEach((line,i)=>{
    text(line,pad,610+i*52,hookFont,'#555148',hookP);
  });

  drawRelief(phase(p,.38,.78));

  const sig=phase(p,.66,.84);
  text('01 / DECISION RELIEF',pad,1213,'12px ui-monospace','#666158',sig);
  ctx.textAlign='right';
  text('18 CHOICES / YOUR PATTERN',W-pad,1213,'12px ui-monospace','#666158',sig);
  ctx.textAlign='left';
  ctx.save();
  ctx.globalAlpha=sig;
  ctx.fillStyle='#3434303a';
  ctx.fillRect(pad,1235,W-pad*2,1);
  ctx.restore();
  text('篩選  /  耐心  /  精準',pad,1280,'22px "PingFang TC","Noto Sans CJK TC",sans-serif','#393830',sig);
  ctx.textAlign='right';
  text('82 / '+data.code,W-pad,1308,'15px ui-monospace','#555248',sig);
  ctx.textAlign='left';

  const sweep=phase(p,.78,.93);
  if(sweep>0&&sweep<1){
    const x=-260+sweep*(W+520);
    const g=ctx.createLinearGradient(x-180,0,x+180,0);
    g.addColorStop(0,'rgba(255,230,170,0)');
    g.addColorStop(.5,'rgba(255,235,185,.22)');
    g.addColorStop(1,'rgba(255,230,170,0)');
    ctx.save();
    ctx.globalCompositeOperation='screen';
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  text('IDENTITY ISSUED',W-248,133,'700 10px ui-monospace','#756b54',phase(p,.90,1));
}
function stop(){
  if(raf)cancelAnimationFrame(raf);
  raf=0;
}
function play(onDone){
  stop();
  startAt=performance.now();
  const frame=now=>{
    const p=clamp((now-startAt)/DURATION);
    draw(p);
    if(p<1)raf=requestAnimationFrame(frame);
    else{
      raf=0;
      status.textContent='IDENTITY ISSUED / STATIC END FRAME';
      if(onDone)onDone();
    }
  };
  status.textContent='PLAYING / IDENTITY FORMATION';
  raf=requestAnimationFrame(frame);
}
async function loadData(){
  try{
    const types=await fetch('./data/types.json',{cache:'no-store'}).then(r=>r.json());
    if(types&&types.IWGC){
      data.name=types.IWGC.name||data.name;
      data.hook=types.IWGC.hook||data.hook;
      data.color=types.IWGC.color||data.color;
    }
  }catch(e){}
  draw(0);
  play();
}
function pickMime(){
  const candidates=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  if(!window.MediaRecorder||!MediaRecorder.isTypeSupported)return '';
  return candidates.find(x=>MediaRecorder.isTypeSupported(x))||'';
}
async function exportMotion(){
  if(recording)return;
  recording=true;
  exportBtn.disabled=true;
  replay.disabled=true;
  status.textContent='RENDERING / DYNAMIC SHARE CARD';
  try{
    if(!canvas.captureStream||!window.MediaRecorder)throw new Error('This browser cannot record canvas');
    const mime=pickMime();
    const stream=canvas.captureStream(FPS);
    const chunks=[];
    const options=mime?{mimeType:mime,videoBitsPerSecond:6000000}:{videoBitsPerSecond:6000000};
    const rec=new MediaRecorder(stream,options);
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const done=new Promise((resolve,reject)=>{
      rec.onerror=()=>reject(rec.error||new Error('MediaRecorder failed'));
      rec.onstop=resolve;
    });
    rec.start(200);
    play(()=>setTimeout(()=>rec.stop(),180));
    await done;

    const blob=new Blob(chunks,{type:rec.mimeType||mime||'video/webm'});
    const ext=blob.type.includes('mp4')?'mp4':'webm';
    const file=new File([blob],{toString:()=>''});
    const safeFile=new File([blob],'82TRADE-TraderDNA-IWGC-motion.'+ext,{type:blob.type});
    const url=URL.createObjectURL(blob);

    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[safeFile]})){
      try{
        await navigator.share({files:[safeFile],title:data.code+' · '+data.name,text:'82TRADE / Trader DNA'});
        URL.revokeObjectURL(url);
        status.textContent='SHARED / '+blob.type.toUpperCase();
        return;
      }catch(e){
        if(e&&e.name==='AbortError'){
          URL.revokeObjectURL(url);
          status.textContent='SHARE CANCELLED';
          return;
        }
      }
    }

    const a=document.createElement('a');
    a.href=url;
    a.download=safeFile.name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    status.textContent='EXPORTED / '+ext.toUpperCase()+' / '+(blob.size/1024/1024).toFixed(1)+' MB';
  }catch(e){
    console.error(e);
    status.textContent='EXPORT FAILED / '+e.message;
  }finally{
    recording=false;
    exportBtn.disabled=false;
    replay.disabled=false;
  }
}
replay.addEventListener('click',()=>play());
exportBtn.addEventListener('click',exportMotion);
loadData();
})();