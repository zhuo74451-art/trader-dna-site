(()=>{'use strict';
const canvas=document.querySelector('#card');
const ctx=canvas.getContext('2d');
const replay=document.querySelector('#replay');
const exportBtn=document.querySelector('#export');
const status=document.querySelector('#status');
const W=1080,H=1350,DURATION=5600,FPS=30;
let raf=0,startAt=0,recording=false,noise=null;
const choices=['A','B','A','A','B','A','B','A','B','A','A','B','A','B','A','A','B','A'];
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
  ctx.save();
  ctx.globalAlpha=alpha==null?1:alpha;
  ctx.font=font;
  ctx.fillStyle=color||'#11110f';
  ctx.textAlign=align||'left';
  ctx.fillText(s,x,y);
  ctx.restore();
}
function makeNoise(){
  const c=document.createElement('canvas');c.width=240;c.height=300;
  const g=c.getContext('2d'),img=g.createImageData(c.width,c.height);let seed=437219;
  for(let i=0;i<img.data.length;i+=4){
    seed=(seed*1664525+1013904223)>>>0;
    const v=(seed&1)?255:55;
    img.data[i]=img.data[i+1]=img.data[i+2]=v;
    img.data[i+3]=1+(seed%5);
  }
  g.putImageData(img,0,0);
  return c;
}
function wrap(str,maxWidth,font){
  ctx.font=font;
  const out=[];let line='';
  for(const ch of Array.from(str||'')){
    if(line&&ctx.measureText(line+ch).width>maxWidth){out.push(line);line=ch}else line+=ch;
  }
  if(line)out.push(line);
  return out;
}
function paper(){
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#fbf8f0');
  g.addColorStop(.54,'#f4efe5');
  g.addColorStop(1,'#e8e1d5');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(!noise)noise=makeNoise();
  ctx.save();ctx.globalAlpha=.34;ctx.drawImage(noise,0,0,W,H);ctx.restore();
}
function drawFrame(p){
  const a=phase(p,.00,.16);
  ctx.save();ctx.globalAlpha=a;
  ctx.strokeStyle='rgba(20,19,17,.15)';
  ctx.lineWidth=1.2;
  ctx.strokeRect(42,42,W-84,H-84);
  ctx.fillStyle=data.color;
  ctx.fillRect(42,42,6,(H-84)*expo(a));
  ctx.restore();
}
function drawTypeSlices(p){
  const progress=phase(p,.08,.33);
  const y=198,h=255,slices=7,sh=h/slices;
  for(let i=0;i<slices;i++){
    const local=phase(progress,i*.045,.56+i*.045);
    if(local<=0)continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,y+i*sh,W,sh+2);
    ctx.clip();
    const dir=i%2===0?-1:1;
    const shift=dir*(1-local)*(82+i*6);
    ctx.translate(shift,0);
    text(data.code,68,418,'900 266px Arial','#11110f',.985);
    ctx.restore();
  }
}
function drawRoleCopy(p){
  const a=phase(p,.28,.50);
  const wipe=expo(a);
  ctx.save();
  ctx.beginPath();
  ctx.rect(70,448,520*wipe,250);
  ctx.clip();
  text(data.name,76,520,'700 64px "Songti TC","Noto Serif CJK TC",serif','#11110f',1);
  ctx.fillStyle=data.color;ctx.fillRect(76,548,104,5);
  const hookFont='33px "PingFang TC","Noto Sans CJK TC",sans-serif';
  wrap(data.hook,455,hookFont).slice(0,3).forEach((line,i)=>text(line,76,620+i*47,hookFont,'#514e47',1));
  ctx.restore();

  const meta=phase(p,.38,.56);
  text('SELECTIVE',76,785,'12px ui-monospace','#77736b',meta);
  text('PATIENT',76,812,'12px ui-monospace','#77736b',meta);
  text('PRECISE',76,839,'12px ui-monospace','#77736b',meta);
  text('HIGH THRESHOLD',76,866,'12px ui-monospace','#77736b',meta);
}
function drawSpecies(p){
  const a=phase(p,.23,.58);
  const rise=(1-expo(a))*58;
  const cx=820,base=1058+rise;
  ctx.save();
  ctx.globalAlpha=a;
  ctx.translate(0,rise*.12);

  const shadow=ctx.createRadialGradient(cx,base-10,20,cx,base-10,165);
  shadow.addColorStop(0,'rgba(22,20,16,.16)');
  shadow.addColorStop(1,'rgba(22,20,16,0)');
  ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(cx,base,165,48,0,0,Math.PI*2);ctx.fill();

  const bodyGrad=ctx.createLinearGradient(cx-120,0,cx+110,0);
  bodyGrad.addColorStop(0,'#ede8dd');
  bodyGrad.addColorStop(.48,'#fbf8f0');
  bodyGrad.addColorStop(.70,'#ded6c7');
  bodyGrad.addColorStop(1,'#aaa294');

  ctx.save();
  ctx.translate(cx,base-245);
  ctx.fillStyle='#151512';
  ctx.beginPath();
  ctx.ellipse(0,-180,94,90,-.12,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle=bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-74,-224);
  ctx.quadraticCurveTo(-150,-260,-175,-226);
  ctx.quadraticCurveTo(-120,-194,-82,-182);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(68,-230);
  ctx.quadraticCurveTo(150,-265,177,-226);
  ctx.quadraticCurveTo(119,-191,79,-181);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle=rgba(data.color,.78);
  ctx.lineWidth=7;
  ctx.beginPath();
  ctx.arc(-7,-176,54,.25,Math.PI*1.72);
  ctx.stroke();

  ctx.fillStyle=bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-70,-95);
  ctx.quadraticCurveTo(-102,-20,-82,105);
  ctx.quadraticCurveTo(-52,165,0,175);
  ctx.quadraticCurveTo(54,165,83,105);
  ctx.quadraticCurveTo(105,-20,70,-95);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle='#1b1b18';
  ctx.fillRect(-74,-54,148,28);

  ctx.fillStyle=bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-124,-52,42,160,20);ctx.fill();
  ctx.beginPath();
  ctx.roundRect(82,-52,42,160,20);ctx.fill();

  ctx.fillStyle='#171714';
  ctx.beginPath();ctx.roundRect(-118,92,32,118,15);ctx.fill();
  ctx.beginPath();ctx.roundRect(86,92,32,118,15);ctx.fill();

  ctx.fillStyle=bodyGrad;
  ctx.beginPath();ctx.roundRect(-76,155,48,166,21);ctx.fill();
  ctx.beginPath();ctx.roundRect(28,155,48,166,21);ctx.fill();

  ctx.fillStyle='#191916';
  ctx.beginPath();ctx.ellipse(-52,321,57,24,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(52,321,57,24,0,0,Math.PI*2);ctx.fill();

  ctx.strokeStyle='rgba(20,19,17,.18)';
  ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,-100);ctx.lineTo(0,168);ctx.stroke();
  ctx.restore();

  const id=phase(p,.48,.68);
  text('SPECIES / INITIAL FORM',W-76,1110,'11px ui-monospace','#77736b',id,'right');
  ctx.restore();
}
function decisionValue(t){
  const vals=choices.map(x=>x==='A'?1:-1),u=t*17,i=Math.min(16,Math.floor(u)),f=u-i,s=f*f*(3-2*f);
  return vals[i]*(1-s)+vals[i+1]*s;
}
function drawRelief(p){
  const progress=phase(p,.48,.79),alpha=phase(p,.42,.60);
  const x0=-105,x1=835,y0=1000;
  ctx.save();ctx.globalAlpha=alpha;
  ctx.beginPath();ctx.rect(0,820,835*progress,300);ctx.clip();
  for(let b=-15;b<=15;b++){
    ctx.beginPath();
    for(let k=0;k<=180;k++){
      const t=k/180,x=x0+t*(x1-x0),m=Math.pow(Math.sin(Math.PI*t),1.18),v=decisionValue(t);
      const y=y0+b*7.2-Math.sin(t*Math.PI*2.0+.48)*64*m-v*34*m+Math.cos(t*8+b*.07)*4;
      if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    ctx.strokeStyle=b%5===0?rgba(data.color,.34):'rgba(70,66,58,.27)';
    ctx.lineWidth=b%5===0?1.8:1.05;
    ctx.stroke();
  }
  ctx.restore();
}
function drawDecisionTape(p){
  const a=phase(p,.66,.86),x=76,y=1142,w=928,gap=9,cell=(w-gap*17)/18;
  ctx.save();ctx.globalAlpha=a;
  ctx.strokeStyle='rgba(24,23,20,.12)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  choices.forEach((choice,i)=>{
    const appear=phase(a,i/24,(i+4)/24);
    const cx=x+i*(cell+gap)+cell/2;
    const len=(choice==='A'?-1:1)*(15+(i%4)*5)*appear;
    ctx.strokeStyle=i%5===0?rgba(data.color,.76):'rgba(24,23,20,.43)';
    ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(cx,y);ctx.lineTo(cx,y+len);ctx.stroke();
  });
  ctx.restore();
}
function drawFoil(p){
  const a=phase(p,.80,.95);
  if(a<=0||a>=1)return;
  const x=-260+a*(W+520);
  const g=ctx.createLinearGradient(x-190,0,x+190,0);
  g.addColorStop(0,'rgba(255,255,255,0)');
  g.addColorStop(.46,rgba(data.color,.10));
  g.addColorStop(.51,'rgba(255,255,255,.24)');
  g.addColorStop(.56,rgba(data.color,.08));
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
}
function draw(p){
  ctx.clearRect(0,0,W,H);
  paper();
  drawFrame(p);

  text('82TRADE',76,92,'800 28px Arial','#11110f',phase(p,.00,.12));
  text('TRADER DNA / IDENTITY EDITION',W-76,89,'13px ui-monospace','#656159',phase(p,.00,.14),'right');
  ctx.save();ctx.globalAlpha=phase(p,.00,.14);ctx.fillStyle='rgba(20,19,17,.15)';ctx.fillRect(76,120,W-152,1);ctx.restore();
  text('YOUR TRADER DNA',76,177,'13px ui-monospace','#69655e',phase(p,.03,.18));

  drawTypeSlices(p);
  drawSpecies(p);
  drawRoleCopy(p);
  drawRelief(p);
  drawDecisionTape(p);

  const foot=phase(p,.72,.90);
  text('01 / DECISION RELIEF',76,1209,'12px ui-monospace','#68645d',foot);
  text('18 CHOICES / YOUR PATTERN',W-76,1209,'12px ui-monospace','#68645d',foot,'right');
  ctx.save();ctx.globalAlpha=foot;ctx.fillStyle='rgba(20,19,17,.16)';ctx.fillRect(76,1236,W-152,1);ctx.restore();
  text('篩選 / 耐心 / 精準 / 高閾值',76,1281,'21px "PingFang TC","Noto Sans CJK TC",sans-serif','#35342f',foot);
  text('82 / '+data.code,W-76,1308,'15px ui-monospace','#555148',foot,'right');

  drawFoil(p);
  text('IDENTITY ISSUED',W-76,157,'700 10px ui-monospace','#696258',phase(p,.92,1),'right');
}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function play(onDone){
  stop();startAt=performance.now();status.textContent='PLAYING / PRINT-TO-LIFE V3';
  const frame=now=>{
    const p=clamp((now-startAt)/DURATION);
    draw(p);
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
  recording=true;exportBtn.disabled=true;replay.disabled=true;status.textContent='RENDERING / DYNAMIC SHARE CARD V3';
  try{
    if(!canvas.captureStream||!window.MediaRecorder)throw new Error('This browser cannot record canvas');
    const mime=pickMime(),stream=canvas.captureStream(FPS),chunks=[];
    const rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:6800000}:{videoBitsPerSecond:6800000});
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    const done=new Promise((resolve,reject)=>{rec.onerror=()=>reject(rec.error||new Error('MediaRecorder failed'));rec.onstop=resolve});
    rec.start(200);play(()=>setTimeout(()=>rec.stop(),180));await done;
    const blob=new Blob(chunks,{type:rec.mimeType||mime||'video/webm'});
    const ext=blob.type.includes('mp4')?'mp4':'webm';
    const file=new File([blob],'82TRADE-TraderDNA-IWGC-print-to-life-v3.'+ext,{type:blob.type});
    const url=URL.createObjectURL(blob);
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file],title:data.code+' · '+data.name,text:'82TRADE / Trader DNA'});
        URL.revokeObjectURL(url);status.textContent='SHARED / '+blob.type.toUpperCase();return;
      }catch(e){
        if(e&&e.name==='AbortError'){URL.revokeObjectURL(url);status.textContent='SHARE CANCELLED';return}
      }
    }
    const a=document.createElement('a');a.href=url;a.download=file.name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    status.textContent='EXPORTED / '+ext.toUpperCase()+' / '+(blob.size/1024/1024).toFixed(1)+' MB';
  }catch(e){
    console.error(e);status.textContent='EXPORT FAILED / '+e.message;
  }finally{
    recording=false;exportBtn.disabled=false;replay.disabled=false;
  }
}
replay.addEventListener('click',()=>play());
exportBtn.addEventListener('click',exportMotion);
loadData();
})();