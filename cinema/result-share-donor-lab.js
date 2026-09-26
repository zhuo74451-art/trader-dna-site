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
}));
dock.dataset.format='4:5';
(async()=>{try{await document.fonts.ready}catch(e){} document.documentElement.dataset.fontsReady='1'})(); 
})();