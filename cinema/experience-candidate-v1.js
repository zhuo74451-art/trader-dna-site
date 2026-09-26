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
    +'<div class="ec-hero-stat"><b>16</b><span>INITIAL CLASSES / 初始職業</span></div>'
    +'<div class="ec-hero-stat"><b>6</b><span>CORE DIMENSIONS / 核心維度</span></div>'
    +'<div class="ec-hero-stat"><b>18</b><span>KEY CHOICES / 關鍵選擇</span></div>'
    +'<div class="ec-hero-stat"><b>≈3</b><span>MINUTES / 分鐘</span></div>'
    +'</div>';
}

function mountLanding(){
  const hero=view?.querySelector('.hero');
  if(!hero||hero.dataset.ecMounted==='1')return;
  hero.dataset.ecMounted='1';
  const title=hero.querySelector('h1');
  if(title)title.innerHTML='在更大的世界中，<br><em>形成你的身份。</em>';
  safeText(hero.querySelector('.hero-copy'),'18 個選擇，約 3 分鐘。沒有正確答案，只有在判斷、出手與改變主意時反覆出現的你。');
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

function candidateSprite(){
  const s=manifest?.candidateSprite;
  const media=s?.media||s?.fallback;
  if(!media||!Number.isFinite(Number(s?.columns))||!Number.isFinite(Number(s?.rows)))return null;
  return {media,columns:Number(s.columns),rows:Number(s.rows),quality:media.includes('initial-class-sprite-hq.webp')?'hq-binary':'fallback'};
}
function applySprite(el,index){
  const s=candidateSprite();
  if(!el||!s||!Number.isInteger(index)||index<0||index>=s.columns*s.rows)return false;
  const col=index%s.columns,row=Math.floor(index/s.columns);
  const x=s.columns<=1?0:(col/(s.columns-1))*100;
  const y=s.rows<=1?0:(row/(s.rows-1))*100;
  el.classList.add('ec-sprite-art');
  el.style.backgroundImage='url("'+s.media+'")';
  el.style.backgroundSize=(s.columns*100)+'% '+(s.rows*100)+'%';
  el.style.backgroundPosition=x.toFixed(4)+'% '+y.toFixed(4)+'%';
  el.dataset.ready='1';
  el.dataset.spriteIndex=String(index);
  return true;
}

let spriteImage=null;
function warmCandidateSprite(){
  const s=candidateSprite();
  if(!s?.media||spriteImage)return;
  const img=new Image();
  img.decoding='async';
  img.onload=()=>{spriteImage=img};
  img.src=s.media;
}
function drawSpriteCellCover(ctx,img,index,dx,dy,dw,dh){
  const s=candidateSprite();if(!s)return;
  const sw=img.naturalWidth/s.columns,sh=img.naturalHeight/s.rows;
  const sx=(index%s.columns)*sw,sy=Math.floor(index/s.columns)*sh;
  const sa=sw/sh,ta=dw/dh;
  let csx=sx,csy=sy,csw=sw,csh=sh;
  if(sa>ta){csw=sh*ta;csx=sx+(sw-csw)/2}else{csh=sw/ta;csy=sy+(sh-csh)/2}
  ctx.drawImage(img,csx,csy,csw,csh,dx,dy,dw,dh);
}
function augmentMaterial02({canvas,ctx,data,format,W,H}){
  const entry=manifest?.classes?.[data?.code];
  if(!spriteImage||!entry||!Number.isInteger(entry.spriteIndex))return;
  const tall=H>1500;

  // Keep the approved initial-class art secondary to the editorial card.
  // The current visual-bible crop is intentionally not stretched to full-bleed;
  // a future isolated render can replace this layer without changing layout.
  const dx=tall?520:500,dy=tall?610:465,dw=tall?485:470,dh=tall?720:555;

  const pane=document.createElement('canvas');
  pane.width=Math.round(dw);pane.height=Math.round(dh);
  const pctx=pane.getContext('2d');
  pctx.imageSmoothingEnabled=true;
  pctx.imageSmoothingQuality='high';
  drawSpriteCellCover(pctx,spriteImage,entry.spriteIndex,0,0,dw,dh);

  // Four-side editorial feather: remove the pasted-rectangle feeling.
  pctx.globalCompositeOperation='destination-in';
  const maskX=pctx.createLinearGradient(0,0,dw,0);
  maskX.addColorStop(0,'rgba(0,0,0,0)');
  maskX.addColorStop(.10,'rgba(0,0,0,.72)');
  maskX.addColorStop(.20,'rgba(0,0,0,1)');
  maskX.addColorStop(.84,'rgba(0,0,0,1)');
  maskX.addColorStop(1,'rgba(0,0,0,0)');
  pctx.fillStyle=maskX;pctx.fillRect(0,0,dw,dh);

  const maskY=pctx.createLinearGradient(0,0,0,dh);
  maskY.addColorStop(0,'rgba(0,0,0,.42)');
  maskY.addColorStop(.09,'rgba(0,0,0,1)');
  maskY.addColorStop(.80,'rgba(0,0,0,1)');
  maskY.addColorStop(1,'rgba(0,0,0,0)');
  pctx.fillStyle=maskY;pctx.fillRect(0,0,dw,dh);

  ctx.save();
  ctx.globalAlpha=.93;
  ctx.drawImage(pane,dx,dy,dw,dh);
  ctx.restore();

  // A restrained registration mark instead of another UI panel.
  ctx.save();
  ctx.font='10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle='rgba(72,68,60,.54)';
  ctx.textAlign='right';
  ctx.fillText('INITIAL CLASS / '+data.code,W-76,dy+14);
  ctx.restore();

  canvas.dataset.ecClassMedia='1';
  const studio=view?.querySelector('.v3-share-studio');
  if(studio)studio.dataset.ecClassShare='1';
}

function mountResult(){
  const result=view?.querySelector('.result');
  if(!result||result.dataset.ecMounted==='1')return;
  if(result.dataset.v4Ready!=='1'||result.dataset.cinemaReady!=='1'||result.dataset.d4Ready!=='1')return;
  const code=result.querySelector('.result-hero .code')?.textContent?.trim();
  const entry=manifest?.classes?.[code];
  const mark=result.querySelector('.v4-result-mark');
  const stack=result.querySelector('.v47-identity-stack');

  if(entry?.resultMedia&&stack&&!stack.querySelector('.ec-class-media')){
    const layer=document.createElement('div');
    layer.className='ec-class-media';
    layer.appendChild(mediaElement(entry.resultMedia,entry.poster));
    layer.dataset.ready='1';
    stack.appendChild(layer);
    result.dataset.ecClassVisual='approved-media';
  }else if(mark&&candidateSprite()&&Number.isInteger(entry?.spriteIndex)&&!mark.querySelector('.ec-class-sprite-media')){
    const art=document.createElement('div');
    art.className='ec-class-sprite-media';
    art.setAttribute('aria-hidden','true');
    if(applySprite(art,entry.spriteIndex)){
      mark.appendChild(art);
      result.dataset.ecClassVisual='approved-visual-bible-web-crop';
      result.dataset.ecClassReady='1';
    }
  }

  result.dataset.ec='1';
  result.dataset.ecMounted='1';
  mountArchive(result);
}

function mountArchive(result){
  if(result.querySelector('.ec-class-archive'))return;
  const classes=manifest?.classes||{};
  const order=['IWGF','IWGC','IWHF','IWHC','IAGF','IAGC','IAHF','IAHC','SWGF','SWGC','SWHF','SWHC','SAGF','SAGC','SAHF','SAHC'];
  const entries=order.map(code=>[code,classes[code]]).filter(([,v])=>v);
  const approvedReady=entries.length===16&&entries.every(([,v])=>v.archiveThumb);
  const spriteReady=Boolean(candidateSprite())&&entries.length===16&&entries.every(([,v])=>Number.isInteger(v.spriteIndex));
  const section=document.createElement('section');
  section.className='ec-class-archive';
  section.dataset.visualAuthority=approvedReady?'approved-isolated':'approved-visual-bible-web-crop';
  if(!approvedReady&&!spriteReady)section.hidden=true;
  section.innerHTML='<div class="ec-class-archive-head"><div><div class="eyebrow">THE ARCHIVE / INITIAL CLASS GALLERY</div><h2>16 初始職業</h2></div><p>同一個 Species，在第一次轉職後形成 16 種初始職業身份。</p></div><div class="ec-class-rail" aria-label="16 初始職業圖鑑"></div>';
  if(approvedReady||spriteReady){
    const rail=section.querySelector('.ec-class-rail');
    entries.forEach(([code,v])=>{
      const card=document.createElement('article');card.className='ec-class-card';card.dataset.code=code;
      if(v.archiveThumb){
        const img=document.createElement('img');img.src=v.archiveThumb;img.alt=v.name;img.loading='lazy';img.decoding='async';card.appendChild(img);
      }else{
        const art=document.createElement('div');art.className='ec-class-card-art';art.setAttribute('aria-hidden','true');applySprite(art,v.spriteIndex);card.appendChild(art);
      }
      const meta=document.createElement('div');meta.className='ec-class-meta';meta.innerHTML='<b>'+v.name+'</b><span>'+code+' / '+v.en+'</span>';
      card.appendChild(meta);rail.appendChild(card);
    });
    section.dataset.ready='1';
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
  document.body.dataset.ecSpriteQuality=candidateSprite()?.quality||'missing';
  warmCandidateSprite();
  window.TraderDNAPosterAugment=augmentMaterial02;
  new MutationObserver(queue).observe(view,{subtree:true,childList:true,attributes:true});
  addEventListener('pageshow',queue);
  queue();
})();
})();