(()=>{'use strict';
const card=document.querySelector('#hero-card');
const dock=document.querySelector('#share-dock');
const dialog=document.querySelector('#share-dialog');
const dialogStage=document.querySelector('#dialog-stage');
const flipBtn=document.querySelector('#flip-btn');
const openBtn=document.querySelector('#open-btn');
const closeDialog=document.querySelector('#close-dialog');
const returnBtn=document.querySelector('#return-btn');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const choices=['A','B','A','A','B','A','B','A','B','A','A','B','A','B','A','A','B','A'];
const sampleMaterial={
  code:'IWGC',
  name:'狙擊手',
  hook:'機會一直都有。真正值得你出手的，沒有幾個。',
  accent:'#88b7ff',
  choices,
  sides:['篩選','耐心','精準']
};
function wrapCanvas(ctx,s,w){
  const lines=[];let line='';
  for(const ch of Array.from(String(s||''))){
    if(line&&ctx.measureText(line+ch).width>w){lines.push(line);line=ch}else line+=ch;
  }
  if(line)lines.push(line);
  return lines;
}
function renderMaterial02(canvas,format='4:5'){
  const d=sampleMaterial;
  const W=1080,H=format==='9:16'?1920:1350;
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  const ink='#171715',paper='#ece7dc',accent=d.accent;
  const tall=H>1500,pad=76,contentW=W-pad*2;
  const text=(str,x,y,font,color=ink)=>{ctx.font=font;ctx.fillStyle=color;ctx.fillText(str,x,y)};
  const rule=(x,y,w,color='#3434303a')=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,1)};

  let g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#f5f1e8');g.addColorStop(.55,paper);g.addColorStop(1,'#dbd5c8');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  let seed=Array.from(d.code).reduce((a,b)=>a+b.charCodeAt(0),193);
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const grain=ctx.createImageData(W,H);
  for(let i=0;i<grain.data.length;i+=4){
    const v=rand()>.5?255:35;
    grain.data[i]=grain.data[i+1]=grain.data[i+2]=v;
    grain.data[i+3]=Math.floor(rand()*7);
  }
  const gc=document.createElement('canvas');gc.width=W;gc.height=H;
  gc.getContext('2d').putImageData(grain,0,0);ctx.drawImage(gc,0,0);

  text('82TRADE',pad,78,'800 27px Arial');
  ctx.textAlign='right';text('TRADER DNA / IDENTITY EDITION',W-pad,76,'13px monospace','#66645b');ctx.textAlign='left';
  rule(pad,110,contentW);
  text('YOUR TRADER DNA',pad,tall?177:169,'14px monospace','#6b675c');

  let codeSize=263;ctx.font='900 '+codeSize+'px Arial';
  while(ctx.measureText(d.code).width>contentW&&codeSize>170){codeSize--;ctx.font='900 '+codeSize+'px Arial'}
  const codeY=tall?442:416;
  text(d.code,pad-8,codeY,'900 '+codeSize+'px Arial');

  let nameSize=66;ctx.font='700 '+nameSize+'px "Noto Serif TC","Songti TC",serif';
  while(ctx.measureText(d.name).width>contentW&&nameSize>40){nameSize--;ctx.font='700 '+nameSize+'px "Noto Serif TC","Songti TC",serif'}
  text(d.name,pad,codeY+96,'700 '+nameSize+'px "Noto Serif TC","Songti TC",serif');
  ctx.fillStyle=accent;ctx.fillRect(pad,codeY+137,98,5);

  ctx.font='34px "Noto Sans TC","PingFang TC",sans-serif';
  const hookLines=wrapCanvas(ctx,d.hook,contentW-24);
  const hookY=codeY+199;
  hookLines.forEach((s,i)=>text(s,pad,hookY+i*53,'34px "Noto Sans TC","PingFang TC",sans-serif','#555249'));

  const reliefTop=Math.max(hookY+hookLines.length*53+20,tall?840:735);
  const reliefBottom=H-(tall?340:212),reliefH=reliefBottom-reliefTop;
  ctx.save();ctx.beginPath();ctx.rect(0,reliefTop-35,W,reliefH+80);ctx.clip();
  const vals=Array.from({length:18},(_,i)=>d.choices[i]==='A'?1:-1);
  const relief=(t,band)=>{
    const i=Math.min(16,Math.floor(t*17)),f=t*17-i,s=f*f*(3-2*f),v=vals[i]*(1-s)+vals[i+1]*s;
    const mound=Math.pow(Math.sin(Math.PI*t),1.2);
    return reliefTop+reliefH*.51+band*8.2-Math.sin(t*Math.PI*2.3+.7)*reliefH*.18*mound-v*reliefH*.07*mound+Math.cos(t*7+band*.035)*10;
  };
  for(let b=-17;b<=17;b++){
    ctx.beginPath();
    for(let k=0;k<=210;k++){
      const t=k/210,x=-90+t*(W+180),y=relief(t,b);
      if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    const shade=ctx.createLinearGradient(0,reliefTop,W,reliefBottom);
    shade.addColorStop(0,'#b2ac9d');shade.addColorStop(.25,'#686458');shade.addColorStop(.48,'#efeadf');shade.addColorStop(.65,'#8c887b');shade.addColorStop(1,'#c9c2b1');
    ctx.strokeStyle=shade;ctx.lineWidth=3.8;ctx.stroke();
    ctx.save();ctx.translate(0,-2.2);ctx.strokeStyle='rgba(255,255,255,.64)';ctx.lineWidth=1.15;ctx.stroke();ctx.restore();
  }
  ctx.restore();

  const sigY=H-(tall?235:137);
  text('01 / DECISION RELIEF',pad,sigY,'12px monospace','#666156');
  ctx.textAlign='right';text('18 CHOICES / YOUR PATTERN',W-pad,sigY,'12px monospace','#666156');ctx.textAlign='left';
  rule(pad,sigY+22,contentW);
  text(d.sides.join('  /  '),pad,sigY+66,'22px "Noto Sans TC","PingFang TC",sans-serif','#393830');
  if(tall){
    text('SAME MARKETS.',pad,H-86,'800 23px Arial');
    text('A DIFFERENT YOU.',pad,H-53,'800 23px Arial');
  }
  ctx.textAlign='right';text('82 / '+d.code,W-pad,H-49,'15px monospace','#555248');ctx.textAlign='left';
  ctx.fillStyle=accent;ctx.fillRect(0,0,7,H);
}
function renderAllMaterialCards(format){
  document.querySelectorAll('.material-card-canvas').forEach(canvas=>renderMaterial02(canvas,format||canvas.dataset.format||'4:5'));
}


function reliefY(t,b){
  const vals=choices.map(x=>x==='A'?1:-1);
  const u=t*17,i=Math.min(16,Math.floor(u)),f=u-i,s=f*f*(3-2*f);
  const v=vals[i]*(1-s)+vals[i+1]*s,m=Math.pow(Math.sin(Math.PI*t),1.18);
  return 96+b*4.6-Math.sin(t*Math.PI*2.25+.7)*31*m-v*16*m+Math.cos(t*7+b*.035)*2.8;
}
function renderRelief(svg){
  const ns='http://www.w3.org/2000/svg';
  for(let b=-16;b<=16;b++){
    const path=document.createElementNS(ns,'path');
    let d='';
    for(let k=0;k<=150;k++){
      const t=k/150,x=-25+t*570,y=reliefY(t,b);
      d+=(k?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)+' ';
    }
    path.setAttribute('d',d);
    path.setAttribute('fill','none');
    path.setAttribute('stroke',b%5===0?'var(--accent)':'currentColor');
    path.setAttribute('stroke-opacity',b%5===0?'.45':'.28');
    path.setAttribute('stroke-width',b%5===0?'1.15':'.75');
    svg.appendChild(path);
  }
}
document.querySelectorAll('.relief').forEach(renderRelief);

const tape=document.querySelector('.choice-tape');
choices.forEach((v,i)=>{
  const bar=document.createElement('i');
  bar.style.height=(20+(i%4)*7)+'px';
  bar.style.transform=v==='A'?'translateY(-50%)':'translateY(50%)';
  bar.dataset.choice=v;
  tape.appendChild(bar);
});

function currentCard(){return document.querySelector('.identity-artifact')}

function tiltMove(e){
  const el=e.currentTarget;
  if(reduce||e.pointerType==='touch')return;
  const r=el.getBoundingClientRect();
  const px=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
  const py=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
  el.style.setProperty('--rx',((.5-py)*3.2).toFixed(2)+'deg');
  el.style.setProperty('--ry',((px-.5)*4.4).toFixed(2)+'deg');
  el.style.setProperty('--gx',(px*100).toFixed(1)+'%');
  el.style.setProperty('--gy',(py*100).toFixed(1)+'%');
  el.style.setProperty('--sheen','1');
  el.style.setProperty('--scale','1.006');
}
function tiltReset(e){
  const el=e.currentTarget;
  el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg');el.style.setProperty('--sheen','0');el.style.setProperty('--scale','1');
}
function bindCard(el){
  if(!el||el.dataset.bound==='1')return;
  el.dataset.bound='1';
  el.addEventListener('pointermove',tiltMove,{passive:true});
  el.addEventListener('pointerleave',tiltReset,{passive:true});
  el.addEventListener('click',ev=>{
    if(ev.target.closest('button'))return;
    el.dataset.flipped=el.dataset.flipped==='1'?'0':'1';
  });
  el.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();el.dataset.flipped=el.dataset.flipped==='1'?'0':'1'}
  });
}
bindCard(card);

function flipCard(){
  const el=currentCard();
  if(el)el.dataset.flipped=el.dataset.flipped==='1'?'0':'1';
}
flipBtn.addEventListener('click',flipCard);

function cloneArtifact(source){
  const clone=source.cloneNode(true);
  clone.id='';
  clone.dataset.bound='0';
  clone.style.width=source.getBoundingClientRect().width+'px';
  bindCard(clone);
  return clone;
}
function animateMorph(source,targetParent,{dialogMode=false}={}){
  if(!source||!targetParent)return;
  if(reduce){
    targetParent.appendChild(source);bindCard(source);return;
  }
  const first=source.getBoundingClientRect();
  const ghost=cloneArtifact(source);
  ghost.classList.add('morph-ghost');
  ghost.style.left=first.left+'px';ghost.style.top=first.top+'px';ghost.style.width=first.width+'px';ghost.style.height=first.height+'px';
  document.body.appendChild(ghost);
  source.classList.add('is-hidden-for-morph');

  const probe=cloneArtifact(source);
  probe.style.visibility='hidden';
  targetParent.appendChild(probe);
  const last=probe.getBoundingClientRect();
  probe.remove();

  const dx=last.left-first.left,dy=last.top-first.top,sx=last.width/first.width,sy=last.height/first.height;
  const anim=ghost.animate([
    {transform:'translate(0,0) scale(1,1)',borderRadius:'0px'},
    {transform:'translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')',borderRadius:'0px'}
  ],{duration:720,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
  anim.onfinish=()=>{
    ghost.remove();
    source.classList.remove('is-hidden-for-morph');
    targetParent.appendChild(source);
    bindCard(source);
  };
}
function openShare(){
  const source=currentCard();
  if(!source)return;
  dialog.showModal();
  requestAnimationFrame(()=>animateMorph(source,dialogStage,{dialogMode:true}));
}
function closeShare(){
  const source=currentCard();
  if(!source){dialog.close();return}
  const target=dock;
  dialog.close();
  requestAnimationFrame(()=>animateMorph(source,target));
}
openBtn.addEventListener('click',openShare);
closeDialog.addEventListener('click',closeShare);
dialog.addEventListener('click',e=>{if(e.target===dialog)closeShare()});

function moveToDock(){
  const source=currentCard();
  if(source&&source.parentElement!==dock)animateMorph(source,dock);
  dock.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
}
returnBtn.addEventListener('click',()=>{
  const source=currentCard();
  const heroWrap=document.querySelector('.hero-artifact-wrap');
  if(source&&source.parentElement!==heroWrap)animateMorph(source,heroWrap);
  document.querySelector('#result-scene').scrollIntoView({behavior:reduce?'auto':'smooth'});
});

const shareObserver=new IntersectionObserver(entries=>{
  const entry=entries[0];
  const source=currentCard();
  if(!source)return;
  if(entry.isIntersecting&&entry.intersectionRatio>.18&&source.parentElement!==dock){
    animateMorph(source,dock);
  }else if(!entry.isIntersecting&&entry.boundingClientRect.top>0){
    const heroWrap=document.querySelector('.hero-artifact-wrap');
    if(source.parentElement!==heroWrap)animateMorph(source,heroWrap);
  }
},{threshold:[0,.18,.5]});
shareObserver.observe(document.querySelector('#share-scene'));

document.querySelectorAll('[data-format]').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('[data-format]').forEach(x=>x.classList.toggle('active',x===btn));
  dock.dataset.format=btn.dataset.format;
  const active=currentCard()?.querySelector('.material-card-canvas');
  if(active){active.dataset.format=btn.dataset.format;renderMaterial02(active,btn.dataset.format)}
}));
dock.dataset.format='4:5';
(async()=>{
  try{await document.fonts.ready}catch(e){}
  renderAllMaterialCards('4:5');
  document.documentElement.dataset.fontsReady='1';
})(); 
})();