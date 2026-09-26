(()=>{'use strict';
const canvas=document.querySelector('#card');
const ctx=canvas.getContext('2d');
const replay=document.querySelector('#replay');
const exportBtn=document.querySelector('#export');
const status=document.querySelector('#status');
const W=1080,H=1350,DURATION=5400,FPS=30;
let raf=0,startAt=0,recording=false,noise=null;
const choices=['A','B','A','A','B','A','B','A','B','A','A','B','A','B','A','A','B','A'];
let data={code:'IWGC',name:'狙擊手',hook:'機會一直都有。真正值得你出手的，沒有幾個。',color:'#88B7FF'};

const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const power3=t=>{t=clamp(t);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
const expo=t=>1-Math.pow(1-clamp(t),4);
const phase=(p,a,b)=>smooth((p-a)/(b-a));

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
    const v=(seed&1)?255:55;
    img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=1+(seed%5);
  }
  g.putImageData(img,0,0);return c;
}
function paper(){
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#fbf8f0');g.addColorStop(.54,'#f4efe5');g.addColorStop(1,'#e8e1d5');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(!noise)noise=makeNoise();
  ctx.save();ctx.globalAlpha=.30;ctx.drawImage(noise,0,0,W,H);ctx.restore();
}
function wrap(str,maxWidth,font){
  ctx.font=font;const out=[];let line='';
  for(const ch of Array.from(str||'')){if(line&&ctx.measureText(line+ch).width>maxWidth){out.push(line);line=ch}else line+=ch}
  if(line)out.push(line);return out;
}
function lerp(a,b,t){return a+(b-a)*t}
function drawFrame(p){
  const a=phase(p,.00,.12);
  ctx.save();ctx.globalAlpha=a;
  ctx.strokeStyle='rgba(20,19,17,.15)';ctx.lineWidth=1.1;ctx.strokeRect(42,42,W-84,H-84);
  ctx.fillStyle=data.color;ctx.fillRect(42,42,6,(H-84)*expo(a));
  ctx.restore();
}
function finalLetterTargets(){
  ctx.save();ctx.font='900 266px Arial';
  const chars=Array.from(data.code),gap=-8;
  const widths=chars.map(ch=>ctx.measureText(ch).width);
  ctx.restore();
  const out=[];let x=68;
  widths.forEach((w,i)=>{out.push({x,y:419});x+=w+gap});
  return out;
}
function drawAssembly(p){
  const chars=Array.from(data.code);
  const starts=[
    {x:78,y:320,r:-.08},
    {x:690,y:315,r:.05},
    {x:100,y:895,r:.06},
    {x:735,y:900,r:-.07}
  ];
  const targets=finalLetterTargets();
  const lineA=phase(p,.03,.24)*(1-phase(p,.30,.48));
  ctx.save();ctx.globalAlpha=lineA;ctx.strokeStyle=rgba(data.color,.24);ctx.lineWidth=1;
  for(let i=0;i<4;i++){
    const s=starts[i],t=targets[i];
    ctx.beginPath();ctx.moveTo(s.x+55,s.y-80);ctx.lineTo(t.x+55,t.y-75);ctx.stroke();
    ctx.fillStyle=rgba(data.color,.42);
    ctx.fillRect(s.x+51,s.y-84,8,8);
  }
  ctx.restore();

  chars.forEach((ch,i)=>{
    const begin=.05+i*.035,end=.34+i*.03;
    const m=power3((p-begin)/(end-begin));
    const s=starts[i],t=targets[i];
    const x=lerp(s.x,t.x,m),y=lerp(s.y,t.y,m),rot=lerp(s.r,0,m);
    const reveal=phase(p,begin-.02,begin+.10);
    ctx.save();
    ctx.globalAlpha=reveal;
    ctx.translate(x,y);
    ctx.rotate(rot);
    ctx.beginPath();
    const clipH=300*expo(reveal);
    ctx.rect(-20,-260,280,clipH);
    ctx.clip();
    text(ch,0,0,'900 266px Arial','#11110f',1);
    ctx.restore();
  });
}
function drawRole(p){
  const a=phase(p,.34,.54),wipe=expo(a);
  ctx.save();ctx.beginPath();ctx.rect(74,450,520*wipe,245);ctx.clip();
  text(data.name,76,520,'700 64px "Songti TC","Noto Serif CJK TC",serif','#11110f',1);
  ctx.fillStyle=data.color;ctx.fillRect(76,548,102,5);
  const hookFont='33px "PingFang TC","Noto Sans CJK TC",sans-serif';
  wrap(data.hook,480,hookFont).slice(0,3).forEach((line,i)=>text(line,76,620+i*47,hookFont,'#514e47',1));
  ctx.restore();
}
function decisionValue(t){
  const vals=choices.map(x=>x==='A'?1:-1),u=t*17,i=Math.min(16,Math.floor(u)),f=u-i,s=f*f*(3-2*f);
  return vals[i]*(1-s)+vals[i+1]*s;
}
function drawRelief(p){
  const progress=phase(p,.48,.80),alpha=phase(p,.43,.60);
  const x0=-90,x1=880,y0=962;
  ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.rect(0,790,880*progress,315);ctx.clip();
  for(let b=-16;b<=16;b++){
    ctx.beginPath();
    for(let k=0;k<=190;k++){
      const t=k/190,x=x0+t*(x1-x0),m=Math.pow(Math.sin(Math.PI*t),1.16),v=decisionValue(t);
      const y=y0+b*7.15-Math.sin(t*Math.PI*2.08+.44)*70*m-v*36*m+Math.cos(t*8+b*.08)*4;
      if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    ctx.strokeStyle=b%5===0?rgba(data.color,.33):'rgba(70,66,58,.27)';
    ctx.lineWidth=b%5===0?1.8:1.05;ctx.stroke();
  }
  ctx.restore();
}
function drawDecisionTape(p){
  const a=phase(p,.64,.86),x=76,y=1139,w=928,gap=9,cell=(w-gap*17)/18;
  ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='rgba(24,23,20,.12)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  choices.forEach((choice,i)=>{
    const local=phase(a,i/23,(i+3)/23);
    const cx=x+i*(cell+gap)+cell/2,len=(choice==='A'?-1:1)*(15+(i%4)*5)*local;
    ctx.strokeStyle=i%5===0?rgba(data.color,.78):'rgba(24,23,20,.43)';
    ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(cx,y);ctx.lineTo(cx,y+len);ctx.stroke();
  });
  ctx.restore();
}
function drawFoil(p){
  const a=phase(p,.80,.95);
  if(a<=0||a>=1)return;
  const x=-260+a*(W+520),g=ctx.createLinearGradient(x-190,0,x+190,0);
  g.addColorStop(0,'rgba(255,255,255,0)');
  g.addColorStop(.47,rgba(data.color,.09));
  g.addColorStop(.51,'rgba(255,255,255,.23)');
  g.addColorStop(.56,rgba(data.color,.07));
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
}
function draw(p){
  ctx.clearRect(0,0,W,H);paper();drawFrame(p);
  text('82TRADE',76,92,'800 28px Arial','#11110f',phase(p,.00,.10));
  text('TRADER DNA / IDENTITY EDITION',W-76,89,'13px ui-monospace','#656159',phase(p,.00,.12),'right');
  ctx.save();ctx.globalAlpha=phase(p,.00,.12);ctx.fillStyle='rgba(20,19,17,.15)';ctx.fillRect(76,120,W-152,1);ctx.restore();
  text('YOUR TRADER DNA',76,177,'13px ui-monospace','#69655e',phase(p,.03,.17));

  drawAssembly(p);
  drawRole(p);
  drawRelief(p);
  drawDecisionTape(p);

  const traits=phase(p,.52,.70);
  text('SELECTIVE',76,784,'12px ui-monospace','#77736b',traits);
  text('PATIENT',76,811,'12px ui-monospace','#77736b',traits);
  text('PRECISE',76,838,'12px ui-monospace','#77736b',traits);
  text('HIGH THRESHOLD',76,865,'12px ui-monospace','#77736b',traits);

  const foot=phase(p,.72,.90);
  text('01 / DECISION RELIEF',76,1208,'12px ui-monospace','#68645d',foot);
  text('18 CHOICES / YOUR PATTERN',W-76,1208,'12px ui-monospace','#68645d',foot,'right');
  ctx.save();ctx.globalAlpha=foot;ctx.fillStyle='rgba(20,19,17,.16)';ctx.fillRect(76,1236,W-152,1);ctx.restore();
  text('篩選 / 耐心 / 精準 / 高閾值',76,1281,'21px "PingFang TC","Noto Sans CJK TC",sans-serif','#35342f',foot);
  text('82 / '+data.code,W-76,1308,'15px ui-monospace','#555148',foot,'right');

  drawFoil(p);
  text('IDENTITY ISSUED',W-76,157,'700 10px ui-monospace','#696258',phase(p,.92,1),'right');
}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function play(onDone){
  stop();startAt=performance.now();status.textContent='PLAYING / DNA ASSEMBLY V4';
  const frame=now=>{
    const p=clamp((now-startAt)/DURATION);draw(p);
    if(p<1)raf=requestAnimationFrame(frame);
    else{raf=0;status.textContent='IDENTITY ISSUED / STATIC END FRAME';if(onDone)onDone()}
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
  draw(0);play();
}
function pickMime(){
  const candidates=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  if(!window.MediaRecorder||!MediaRecorder.isTypeSupported)return '';
  return candidates.find(x=>MediaRecorder.isTypeSupported(x))||'';
}
async function exportMotion(){
  if(recording)return;
  recording=true;exportBtn.disabled=true;replay.disabled=true;status.textContent='RENDERING / DNA ASSEMBLY V4';
  try{
    if(!canvas.captureStream||!window.MediaRecorder)throw new Error('This browser cannot record canvas');
    const mime=pickMime(),stream=canvas.captureStream(FPS),chunks=[];
    const rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:6800000}:{videoBitsPerSecond:6800000});
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const done=new Promise((resolve,reject)=>{rec.onerror=()=>reject(rec.error||new Error('MediaRecorder failed'));rec.onstop=resolve});
    rec.start(200);play(()=>setTimeout(()=>rec.stop(),180));await done;
    const blob=new Blob(chunks,{type:rec.mimeType||mime||'video/webm'});
    const ext=blob.type.includes('mp4')?'mp4':'webm';
    const file=new File([blob],'82TRADE-TraderDNA-IWGC-dna-assembly-v4.'+ext,{type:blob.type});
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