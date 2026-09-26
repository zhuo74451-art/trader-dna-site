(()=>{'use strict';
const view=document.querySelector('#view');
document.body.dataset.experienceCandidate='1';
let manifest=null,queued=false;

function safeText(el,value){if(el)el.textContent=value}

async function loadManifest(){
  try{
    const r=await fetch('./data/initial-class-visuals-v1.json',{cache:'no-store'});
    if(!r.ok)return null;
    return await r.json();
  }catch{return null}
}

function statsHtml(){
  return '<div class="ec-hero-stats" aria-label="Trader DNA summary">'
    +'<div class="ec-hero-stat"><b>16</b><span>INITIAL CLASSES / 初始职业</span></div>'
    +'<div class="ec-hero-stat"><b>6</b><span>CORE DIMENSIONS / 核心维度</span></div>'
    +'<div class="ec-hero-stat"><b>18</b><span>KEY CHOICES / 关键选择</span></div>'
    +'<div class="ec-hero-stat"><b>≈3</b><span>MINUTES / 分钟</span></div>'
    +'</div>';
}

function mountLanding(){
  const hero=view?.querySelector('.hero');
  if(!hero||hero.dataset.ecMounted==='1')return;
  hero.dataset.ecMounted='1';
  const title=hero.querySelector('h1');
  if(title)title.innerHTML='在更大的世界中，<br><em>形成你的身份。</em>';
  safeText(hero.querySelector('.hero-copy'),'18 个选择，约 3 分钟。没有正确答案，只有在判断、出手与改变主意时反复出现的你。');
  const kicker=hero.querySelector('.kicker');
  if(kicker)kicker.innerHTML='82TRADE / TRADER DNA<span class="ec-hero-subline">IDENTITY FORMS IN A LARGER WORLD.</span>';
  hero.querySelector('.hero-meta')?.insertAdjacentHTML('beforebegin',statsHtml());

  const material=hero.querySelector('.v3-hero-material');
  if(material&&!material.querySelector('.ec-origin-badge')){
    material.insertAdjacentHTML('beforeend','<div class="ec-origin-badge"><b>SPECIES / UNASSIGNED</b><i>BEFORE THE FIRST TRANSITION</i></div><div class="ec-species-media" aria-hidden="true"></div>');
  }

  const media=material?.querySelector('.ec-species-media');
  const src=manifest?.baseSpecies?.heroMedia;
  if(media&&src){
    const ext=String(src).split('?')[0].split('.').pop()?.toLowerCase();
    if(['mp4','webm','mov'].includes(ext)){
      media.innerHTML='<video muted loop autoplay playsinline preload="metadata"></video>';
      const v=media.querySelector('video');v.src=src;if(manifest.baseSpecies.poster)v.poster=manifest.baseSpecies.poster;
    }else{
      media.innerHTML='<img alt="" decoding="async">';
      media.querySelector('img').src=src;
    }
    media.dataset.ready='1';
  }
}

function mountQuestion(){
  const q=view?.querySelector('.quiz-wrap');
  if(!q||q.dataset.ecMounted==='1')return;
  q.dataset.ecMounted='1';
  q.querySelector('.scan')?.insertAdjacentHTML('afterend','<div class="ec-hero-subline">FORMATION / DECISION TRACE</div>');
}

function mountReveal(){
  const reveal=view?.querySelector('.reveal');
  if(!reveal||reveal.dataset.ec==='1')return;
  reveal.dataset.ec='1';
  safeText(reveal.querySelector('.reveal-label'),'IDENTITY FORMING');
}

function mediaElement(src,poster){
  const ext=String(src||'').split('?')[0].split('.').pop()?.toLowerCase();
  if(['mp4','webm','mov'].includes(ext)){
    const v=document.createElement('video');v.muted=true;v.loop=true;v.autoplay=true;v.playsInline=true;v.preload='metadata';v.src=src;if(poster)v.poster=poster;return v;
  }
  const img=document.createElement('img');img.alt='';img.decoding='async';img.src=src;return img;
}

function mountResult(){
  const result=view?.querySelector('.result');
  if(!result||result.dataset.ec==='1')return;
  result.dataset.ec='1';
  const code=result.querySelector('.result-hero .code')?.textContent?.trim();
  const entry=manifest?.classes?.[code];
  if(entry?.resultMedia){
    const stack=result.querySelector('.v47-identity-stack');
    if(stack&&!stack.querySelector('.ec-class-media')){
      const layer=document.createElement('div');layer.className='ec-class-media';layer.appendChild(mediaElement(entry.resultMedia,entry.poster));layer.dataset.ready='1';stack.appendChild(layer);
    }
  }
  mountArchive(result);
}

function mountArchive(result){
  if(result.querySelector('.ec-class-archive'))return;
  const classes=manifest?.classes||{};
  const entries=Object.entries(classes);
  const allReady=entries.length===16&&entries.every(([,v])=>v.archiveThumb);
  const section=document.createElement('section');
  section.className='ec-class-archive';
  if(!allReady)section.hidden=true;
  section.innerHTML='<div class="ec-class-archive-head"><div><div class="eyebrow">THE ARCHIVE / INITIAL CLASS GALLERY</div><h2>16 初始职业</h2></div><p>同一个 Species，在第一次转职后形成 16 种初始职业身份。</p></div><div class="ec-class-rail"></div>';
  if(allReady){
    const rail=section.querySelector('.ec-class-rail');
    entries.forEach(([code,v])=>{
      const card=document.createElement('article');card.className='ec-class-card';
      const img=document.createElement('img');img.src=v.archiveThumb;img.alt=v.name;img.loading='lazy';img.decoding='async';
      const meta=document.createElement('div');meta.className='ec-class-meta';meta.innerHTML='<b>'+v.name+'</b><span>'+code+' / '+v.en+'</span>';
      card.append(img,meta);rail.appendChild(card);
    });
  }
  result.appendChild(section);
}

function mount(){
  queued=false;
  if(view.querySelector('.hero'))mountLanding();
  if(view.querySelector('.quiz-wrap'))mountQuestion();
  if(view.querySelector('.reveal'))mountReveal();
  if(view.querySelector('.result'))mountResult();
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(mount)}

(async()=>{
  manifest=await loadManifest();
  new MutationObserver(queue).observe(view,{subtree:true,childList:true,attributes:true});
  addEventListener('pageshow',queue);
  queue();
})();
})();