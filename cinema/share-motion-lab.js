(()=>{'use strict';
const canvas=document.querySelector('#card');
const ctx=canvas.getContext('2d');
const replay=document.querySelector('#replay');
const exportBtn=document.querySelector('#export');
const status=document.querySelector('#status');
const W=1080,H=1350,DURATION=5600,FPS=30;
let raf=0,startAt=0,recording=false,noise=null;
const sampleChoices=['A','B','A','A','B','A','B','A','B','A','A','B','A','B','A','A','B','A'];
let data={code:'IWGC',name:'狙擊手',hook:'機會一直都有。真正值得你出手的，沒有幾個。',color:'#88B7FF'};
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
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
  const c=document.createElement('canvas');c.width=220;c.height=280;
  const g=c.getContext('2d'),img=g.createImageData(c.width,c.height);let seed=781233;
  for(let i=0;i<img.data.length;i+=4){
    seed=(seed*1664525+1013904223)>>>0;
    const v=(seed&1)?255:70;
    img.data[i]=img.data[i+1]=img.data[i+2]=v;
    img.data[i+3]=2+(seed%5);
  }
  g.putImageData(img,0,0);return c;
}
function wrap(str,maxWidth,font){
  ctx.font=font;const out=[];let line='';
  for(const ch of Array.from(str||'')){if(line&&ctx.measureText(line+ch).width>maxWidth){out.push(line);line=ch}else line+=ch}
  if(line)out.push(line);return out;
}
function paper(){
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#faf7ef');g.addColorStop(.52,'#f3efe7');g.addColorStop(1,'#e5ded2');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(!noise)noise=makeNoise();
  ctx.save();ctx.globalAlpha=.36;ctx.drawImage(noise,0,0,W,H);ctx.restore();
  ctx.strokeStyle='rgba(24,23,20,.055)';ctx.lineWidth=1;
  for(let y=156;y<H-92;y+=86){ctx.beginPath();ctx.moveTo(70,y);ctx.lineTo(W-70,y);ctx.stroke()}
}
function decisionValue(t){
  const vals=sampleChoices.map(x=>x==='A'?1:-1),u=t*17,i=Math.min(16,Math.floor(u)),f=u-i,s=f*f*(3-2*f);
  return vals[i]*(1-s)+vals[i+1]*s;
}
function drawRelief(progress,alpha){
  const x0=-90,x1=750,y0=970;
  ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.rect(0,820,780*progress,300);ctx.clip();
  for(let b=-17;b<=17;b++){
    ctx.beginPath();
    for(let k=0;k<=170;k++){
      const t=k/170,x=x0+t*(x1-x0),m=Math.pow(Math.sin(Math.PI*t),1.22),v=decisionValue(t);
      const y=y0+b*7.1-Math.sin(t*Math.PI*2.05+.42)*74*m-v*30*m+Math.cos(t*8+b*.09)*4.5;
      if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    ctx.strokeStyle=b%5===0?rgba(data.color,.28):'rgba(74,70,62,.31)';
    ctx.lineWidth=b%5===0?1.9:1.15;ctx.stroke();
  }
  ctx.restore();
}
function drawAperture(p){
  const cx=808,cy=710,r=238,halo=phase(p,.18,.72);
  ctx.save();
  const glow=ctx.createRadialGradient(cx,cy,15,cx,cy,r*1.35);
  glow.addColorStop(0,rgba(data.color,.17*halo));glow.addColorStop(.42,rgba(data.color,.075*halo));glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,r*1.35,0,Math.PI*2);ctx.fill();
  ctx.lineWidth=1.2;ctx.strokeStyle='rgba(24,23,20,.10)';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  ctx.lineWidth=2.1;ctx.strokeStyle=rgba(data.color,.68);ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*halo);ctx.stroke();
  const inner=phase(p,.36,.74);ctx.lineWidth=1;ctx.strokeStyle=rgba(data.color,.22*inner);
  for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(cx,cy,r-34-i*34,Math.PI*.1,Math.PI*(.1+1.38*inner));ctx.stroke()}
  const scan=phase(p,.56,.86);
  if(scan>0&&scan<1){
    const sx=cx-r+scan*(r*2),grad=ctx.createLinearGradient(sx-42,0,sx+42,0);
    grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(.5,rgba(data.color,.22));grad.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=grad;ctx.fillRect(sx-42,cy-r-40,84,r*2+80);
  }
  const presence=phase(p,.40,.78);
  ctx.globalAlpha=.18*presence;ctx.fillStyle='#11110f';ctx.beginPath();ctx.ellipse(cx+8,cy+44,112,178,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.09*presence;ctx.fillStyle=data.color;ctx.beginPath();ctx.ellipse(cx-6,cy-38,70,74,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawDecisionTape(p){
  const a=phase(p,.62,.84),x=74,y=1138,w=930,gap=9,cell=(w-gap*17)/18;
  ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='rgba(24,23,20,.12)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  sampleChoices.forEach((choice,i)=>{
    const cx=x+i*(cell+gap)+cell/2,len=choice==='A'?-(18+(i%4)*5):(18+(i%4)*5);
    ctx.strokeStyle=i%5===0?rgba(data.color,.74):'rgba(24,23,20,.45)';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(cx,y);ctx.lineTo(cx,y+len);ctx.stroke();
  });
  ctx.restore();
}
function draw(p){
  ctx.clearRect(0,0,W,H);paper();
  const pad=74,settle=1+(1-phase(p,.02,.28))*.012;
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(settle,settle);ctx.translate(-W/2,-H/2);
  ctx.strokeStyle='rgba(20,19,17,.16)';ctx.strokeRect(40,40,W-80,H-80);
  ctx.fillStyle=data.color;ctx.fillRect(40,40,5,H-80);
  text('82TRADE',pad,91,'800 28px Arial','#11110f',1);
  text('TRADER DNA  /  IDENTITY EDITION',W-pad,88,'13px ui-monospace','#656159',1,'right');
  ctx.fillStyle='rgba(20,19,17,.15)';ctx.fillRect(pad,119,W-pad*2,1);
  text('YOUR TRADER DNA',pad,176,'13px ui-monospace','#69655e',phase(p,.02,.16));
  drawAperture(p);
  const dna=expo(phase(p,.08,.31));
  ctx.save();ctx.beginPath();ctx.rect(0,190,W*dna,280);ctx.clip();ctx.translate(-22*(1-dna),0);
  text(data.code,pad-4,420,'900 265px Arial','#11110f',.985);ctx.restore();
  const n=phase(p,.24,.43);
  text(data.name,pad,520,'700 64px "Songti TC","Noto Serif CJK TC",serif','#11110f',n);
  ctx.save();ctx.globalAlpha=n;ctx.fillStyle=data.color;ctx.fillRect(pad,550,102,5);ctx.restore();
  const h=phase(p,.30,.54),hookFont='33px "PingFang TC","Noto Sans CJK TC",sans-serif';
  wrap(data.hook,455,hookFont).slice(0,3).forEach((line,i)=>text(line,pad,620+i*47,hookFont,'#514e47',h));
  const traits=phase(p,.42,.60);
  text('SELECTIVE',pad,786,'12px ui-monospace','#77736b',traits);
  text('PATIENT',pad,813,'12px ui-monospace','#77736b',traits);
  text('PRECISE',pad,840,'12px ui-monospace','#77736b',traits);
  text('HIGH THRESHOLD',pad,867,'12px ui-monospace','#77736b',traits);
  drawRelief(phase(p,.44,.78),phase(p,.36,.60));
  drawDecisionTape(p);
  const foot=phase(p,.72,.89);
  text('01 / DECISION RELIEF',pad,1205,'12px ui-monospace','#68645d',foot);
  text('18 CHOICES / YOUR PATTERN',W-pad,1205,'12px ui-monospace','#68645d',foot,'right');
  ctx.save();ctx.globalAlpha=foot;ctx.fillStyle='rgba(20,19,17,.16)';ctx.fillRect(pad,1234,W-pad*2,1);ctx.restore();
  text('篩選  /  耐心  /  精準',pad,1280,'22px "PingFang TC","Noto Sans CJK TC",sans-serif','#35342f',foot);
  text('82 / '+data.code,W-pad,1307,'15px ui-monospace','#555148',foot,'right');
  const sweep=phase(p,.79,.94);
  if(sweep>0&&sweep<1){
    const sx=-260+sweep*(W+520),g=ctx.createLinearGradient(sx-190,0,sx+190,0);
    g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.48,rgba(data.color,.13));g.addColorStop(.52,'rgba(255,255,255,.19)');g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
  }
  text('IDENTITY ISSUED',W-250,155,'700 10px ui-monospace','#696258',phase(p,.91,1));
  ctx.restore();
}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function play(onDone){
  stop();startAt=performance.now();status.textContent='PLAYING / IDENTITY FORMATION V2';
  const frame=now=>{const p=clamp((now-startAt)/DURATION);draw(p);if(p<1)raf=requestAnimationFrame(frame);else{raf=0;status.textContent='IDENTITY ISSUED / STATIC END FRAME';if(onDone)onDone()}};
  raf=requestAnimationFrame(frame);
}
async function loadData(){
  try{
    const types=await fetch('./data/types.json',{cache:'no-store'}).then(r=>r.json());
    if(types&&types.IWGC){data={...data,name:types.IWGC.name||data.name,hook:types.IWGC.hook||data.hook,color:types.IWGC.color||data.color};document.documentElement.style.setProperty('--accent',data.color)}
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
  recording=true;exportBtn.disabled=true;replay.disabled=true;status.textContent='RENDERING / DYNAMIC SHARE CARD V2';
  try{
    if(!canvas.captureStream||!window.MediaRecorder)throw new Error('This browser cannot record canvas');
    const mime=pickMime(),stream=canvas.captureStream(FPS),chunks=[];
    const rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:6500000}:{videoBitsPerSecond:6500000});
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const done=new Promise((resolve,reject)=>{rec.onerror=()=>reject(rec.error||new Error('MediaRecorder failed'));rec.onstop=resolve});
    rec.start(200);play(()=>setTimeout(()=>rec.stop(),180));await done;
    const blob=new Blob(chunks,{type:rec.mimeType||mime||'video/webm'}),ext=blob.type.includes('mp4')?'mp4':'webm';
    const file=new File([blob],'82TRADE-TraderDNA-IWGC-motion-v2.'+ext,{type:blob.type}),url=URL.createObjectURL(blob);
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