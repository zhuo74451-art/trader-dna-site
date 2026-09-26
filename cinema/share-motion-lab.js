(()=>{'use strict';
const canvas=document.querySelector('#card');
const ctx=canvas.getContext('2d');
const replay=document.querySelector('#replay');
const exportBtn=document.querySelector('#export');
const status=document.querySelector('#status');
const W=1080,H=1350,DURATION=4200,FPS=30;
let raf=0,startAt=0,recording=false,noise=null;
const choices=['A','B','A','A','B','A','B','A','B','A','A','B','A','B','A','A','B','A'];
let data={code:'IWGC',name:'狙擊手',hook:'機會一直都有。真正值得你出手的，沒有幾個。',color:'#88B7FF'};

const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const phase=(p,a,b)=>smooth((p-a)/(b-a));
const wave=t=>.5-.5*Math.cos(Math.PI*2*t);

function rgba(hex,a){
  const h=(hex||'#88B7FF').replace('#','');
  const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}
function text(s,x,y,font,color,alpha,align){
  ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.font=font;ctx.fillStyle=color||'#11110f';ctx.textAlign=align||'left';ctx.fillText(s,x,y);ctx.restore();
}
function makeNoise(){
  const c=document.createElement('canvas');c.width=240;c.height=300;
  const g=c.getContext('2d'),img=g.createImageData(c.width,c.height);let seed=437219;
  for(let i=0;i<img.data.length;i+=4){
    seed=(seed*1664525+1013904223)>>>0;
    const v=(seed&1)?255:62;
    img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=1+(seed%4);
  }
  g.putImageData(img,0,0);return c;
}
function paper(lightX){
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#fbf8f0');g.addColorStop(.55,'#f4efe5');g.addColorStop(1,'#e6dfd3');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(!noise)noise=makeNoise();
  ctx.save();ctx.globalAlpha=.28;ctx.drawImage(noise,0,0,W,H);ctx.restore();

  const sheen=ctx.createLinearGradient(lightX-260,0,lightX+260,0);
  sheen.addColorStop(0,'rgba(255,255,255,0)');
  sheen.addColorStop(.5,'rgba(255,255,255,.10)');
  sheen.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sheen;ctx.fillRect(0,0,W,H);
}
function wrap(str,maxWidth,font){
  ctx.font=font;const out=[];let line='';
  for(const ch of Array.from(str||'')){if(line&&ctx.measureText(line+ch).width>maxWidth){out.push(line);line=ch}else line+=ch}
  if(line)out.push(line);return out;
}
function decisionValue(t){
  const vals=choices.map(x=>x==='A'?1:-1),u=t*17,i=Math.min(16,Math.floor(u)),f=u-i,s=f*f*(3-2*f);
  return vals[i]*(1-s)+vals[i+1]*s;
}
function reliefY(t,b,p){
  const m=Math.pow(Math.sin(Math.PI*t),1.16),v=decisionValue(t);
  const breathe=Math.sin(p*Math.PI*2+t*4.2+b*.08)*5.5;
  return 1007+b*7.4-Math.sin(t*Math.PI*2.04+.42)*70*m-v*38*m+breathe*m;
}
function reliefPath(b,p){
  ctx.beginPath();
  for(let k=0;k<=200;k++){
    const t=k/200,x=-70+t*930,y=reliefY(t,b,p);
    if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
}
function drawRelief(p){
  const breathe=.42+.58*wave(p);
  ctx.save();
  ctx.beginPath();ctx.rect(0,735,W,380);ctx.clip();
  for(let b=-17;b<=17;b++){
    reliefPath(b,p);
    const major=b%5===0;
    ctx.strokeStyle=major?rgba(data.color,.22+.10*breathe):'rgba(66,62,55,'+(.22+.05*breathe)+')';
    ctx.lineWidth=major?1.85:1.05;ctx.stroke();
  }

  const scan=(p+.18)%1;
  const sx=-130+scan*1060;
  const glow=ctx.createLinearGradient(sx-115,0,sx+115,0);
  glow.addColorStop(0,'rgba(255,255,255,0)');
  glow.addColorStop(.5,'rgba(255,255,255,.24)');
  glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.globalCompositeOperation='screen';ctx.fillStyle=glow;ctx.fillRect(0,735,W,380);
  ctx.restore();
}
function drawChoiceTape(p){
  const x=76,y=1140,w=928,gap=9,cell=(w-gap*17)/18;
  ctx.save();
  ctx.strokeStyle='rgba(24,23,20,.12)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  choices.forEach((choice,i)=>{
    const pulse=.74+.26*Math.sin(p*Math.PI*2+i*.43);
    const cx=x+i*(cell+gap)+cell/2,len=(choice==='A'?-1:1)*(15+(i%4)*5);
    ctx.strokeStyle=i%5===0?rgba(data.color,.48*pulse):'rgba(24,23,20,'+(.30+.12*pulse)+')';
    ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(cx,y);ctx.lineTo(cx,y+len);ctx.stroke();
  });
  ctx.restore();
}
function drawFoil(p){
  const t=(p+.03)%1,x=-260+t*(W+520);
  const g=ctx.createLinearGradient(x-190,0,x+190,0);
  g.addColorStop(0,'rgba(255,255,255,0)');
  g.addColorStop(.46,rgba(data.color,.055));
  g.addColorStop(.50,'rgba(255,255,255,.17)');
  g.addColorStop(.54,rgba(data.color,.04));
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
}
function draw(p){
  const micro=(Math.sin(p*Math.PI*2)*.003);
  ctx.save();
  ctx.translate(W/2,H/2);
  ctx.scale(1+micro,1+micro);
  ctx.translate(-W/2,-H/2);

  const lightX=-120+((p+.08)%1)*(W+240);
  paper(lightX);

  ctx.strokeStyle='rgba(20,19,17,.15)';ctx.lineWidth=1.1;ctx.strokeRect(42,42,W-84,H-84);
  ctx.fillStyle=data.color;ctx.globalAlpha=.72;ctx.fillRect(42,42,6,H-84);ctx.globalAlpha=1;

  text('82TRADE',76,92,'800 28px Arial','#11110f',1);
  text('TRADER DNA / IDENTITY EDITION',W-76,89,'13px ui-monospace','#656159',1,'right');
  ctx.fillStyle='rgba(20,19,17,.15)';ctx.fillRect(76,120,W-152,1);
  text('YOUR TRADER DNA',76,177,'13px ui-monospace','#69655e',1);

  text(data.code,66,420,'900 266px Arial','#11110f',.985);

  text(data.name,76,520,'700 64px "Noto Serif TC","Songti TC",serif','#11110f',1);
  ctx.fillStyle=data.color;ctx.fillRect(76,548,102,5);

  const hookFont='33px "Noto Sans TC","PingFang TC",sans-serif';
  wrap(data.hook,485,hookFont).slice(0,3).forEach((line,i)=>text(line,76,620+i*47,hookFont,'#514e47',1));

  text('SELECTIVE',76,784,'12px ui-monospace','#77736b',1);
  text('PATIENT',76,811,'12px ui-monospace','#77736b',1);
  text('PRECISE',76,838,'12px ui-monospace','#77736b',1);
  text('HIGH THRESHOLD',76,865,'12px ui-monospace','#77736b',1);

  drawRelief(p);
  drawChoiceTape(p);

  text('01 / DECISION RELIEF',76,1208,'12px ui-monospace','#68645d',1);
  text('18 CHOICES / YOUR PATTERN',W-76,1208,'12px ui-monospace','#68645d',1,'right');
  ctx.fillStyle='rgba(20,19,17,.16)';ctx.fillRect(76,1236,W-152,1);
  text('篩選 / 耐心 / 精準 / 高閾值',76,1281,'21px "Noto Sans TC","PingFang TC",sans-serif','#35342f',1);
  text('82 / '+data.code,W-76,1308,'15px ui-monospace','#555148',1,'right');

  drawFoil(p);
  ctx.restore();
}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function play(onDone){
  stop();startAt=performance.now();status.textContent='PLAYING / LIVING EDITORIAL V5';
  const frame=now=>{
    const p=((now-startAt)%DURATION)/DURATION;
    draw(p);
    if(now-startAt<DURATION){raf=requestAnimationFrame(frame)}
    else{raf=0;draw(0);status.textContent='LIVING POSTER / LOOP READY';if(onDone)onDone()}
  };
  raf=requestAnimationFrame(frame);
}
async function loadData(){
  try{
    const types=await fetch('./data/types.json',{cache:'no-store'}).then(r=>r.json());
    if(types&&types.IWGC){
      data={...data,name:types.IWGC.name||data.name,hook:types.IWGC.hook||data.hook,color:types.IWGC.color||data.color};
      document.documentElement.style.setProperty('--accent',data.color);
    }
  }catch(e){}
  try{await document.fonts.ready}catch(e){}
  draw(0);play();
}
function pickMime(){
  const candidates=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  if(!window.MediaRecorder||!MediaRecorder.isTypeSupported)return '';
  return candidates.find(x=>MediaRecorder.isTypeSupported(x))||'';
}
async function exportMotion(){
  if(recording)return;
  recording=true;exportBtn.disabled=true;replay.disabled=true;status.textContent='RENDERING / LIVING EDITORIAL V5';
  try{
    if(!canvas.captureStream||!window.MediaRecorder)throw new Error('This browser cannot record canvas');
    const mime=pickMime(),stream=canvas.captureStream(FPS),chunks=[];
    const rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:6500000}:{videoBitsPerSecond:6500000});
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const done=new Promise((resolve,reject)=>{rec.onerror=()=>reject(rec.error||new Error('MediaRecorder failed'));rec.onstop=resolve});
    rec.start(200);play(()=>setTimeout(()=>rec.stop(),120));await done;
    const blob=new Blob(chunks,{type:rec.mimeType||mime||'video/webm'});
    const ext=blob.type.includes('mp4')?'mp4':'webm';
    const file=new File([blob],'82TRADE-TraderDNA-IWGC-living-editorial-v5.'+ext,{type:blob.type});
    const url=URL.createObjectURL(blob);
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:data.code+' · '+data.name,text:'82TRADE / Trader DNA'});URL.revokeObjectURL(url);status.textContent='SHARED / '+blob.type.toUpperCase();return}catch(e){if(e&&e.name==='AbortError'){URL.revokeObjectURL(url);status.textContent='SHARE CANCELLED';return}}
    }
    const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
    status.textContent='EXPORTED / '+ext.toUpperCase()+' / '+(blob.size/1024/1024).toFixed(1)+' MB';
  }catch(e){console.error(e);status.textContent='EXPORT FAILED / '+e.message}
  finally{recording=false;exportBtn.disabled=false;replay.disabled=false}
}
replay.addEventListener('click',()=>play());
exportBtn.addEventListener('click',exportMotion);
loadData();
})();