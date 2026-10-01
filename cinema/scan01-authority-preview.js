(()=>{'use strict';
const root=document.querySelector('#view');
const CARD_BASE='./cinema/assets/identity-cards';
const HERO_BASE='./cinema/assets/hero-characters';
const STORAGE_KEY='82trade-trader-dna:quick18-v1.2-2026-09-25';
const TYPE_DATA='./data/types.json';
const PORTRAIT_DATA='./cinema/portraits-detail04-card-0dca88dce1bb.json';
const CLASSICAL_VERSE_OVERRIDES={
  SAGF:{hant:'封侯非我意，但願海波平。',hans:'封侯非我意，但愿海波平。'},
  SAHF:{hant:'草枯鷹眼疾，雪盡馬蹄輕。',hans:'草枯鹰眼疾，雪尽马蹄轻。'},
  SAHC:{hant:'長風破浪會有時，直掛雲帆濟滄海。',hans:'长风破浪会有时，直挂云帆济沧海。'}
};
const CODES=new Set(['IWGF','IWGC','IWHF','IWHC','IAGF','IAGC','IAHF','IAHC','SWGF','SWGC','SWHF','SWHC','SAGF','SAGC','SAHF','SAHC']);
const HERO_FRAME={
  IWGF:{x:100,y:66,scale:1.07,originX:92,originY:68,brightness:.48,mobileX:100,mobileY:64,mobileScale:1.06,mobileOriginX:96,mobileOriginY:70},
  IWGC:{x:100,y:61,scale:1.02,originX:91,originY:64,brightness:.48,mobileX:100,mobileY:59,mobileScale:1.01,mobileOriginX:96,mobileOriginY:65},
  IWHF:{x:100,y:64,scale:1.05,originX:92,originY:66,brightness:.48,mobileX:100,mobileY:61,mobileScale:1.03,mobileOriginX:96,mobileOriginY:67},
  IWHC:{x:100,y:65,scale:1.04,originX:92,originY:68,brightness:.48,mobileX:100,mobileY:63,mobileScale:1.03,mobileOriginX:96,mobileOriginY:69},
  IAGF:{x:100,y:66,scale:1.05,originX:92,originY:68,brightness:.49,mobileX:100,mobileY:63,mobileScale:1.04,mobileOriginX:96,mobileOriginY:69},
  IAGC:{x:100,y:65,scale:1.04,originX:92,originY:67,brightness:.48,mobileX:100,mobileY:62,mobileScale:1.03,mobileOriginX:96,mobileOriginY:68},
  IAHF:{x:100,y:65,scale:1.04,originX:92,originY:67,brightness:.48,mobileX:100,mobileY:62,mobileScale:1.03,mobileOriginX:96,mobileOriginY:68},
  IAHC:{x:100,y:64,scale:1.05,originX:92,originY:66,brightness:.48,mobileX:100,mobileY:61,mobileScale:1.04,mobileOriginX:96,mobileOriginY:67},
  SWGF:{x:100,y:75,scale:1.16,originX:94,originY:78,brightness:.54,mobileX:100,mobileY:74,mobileScale:1.11,mobileOriginX:97,mobileOriginY:78},
  SWGC:{x:100,y:69,scale:1.11,originX:93,originY:72,brightness:.51,mobileX:100,mobileY:67,mobileScale:1.08,mobileOriginX:97,mobileOriginY:73},
  SWHF:{x:100,y:72,scale:1.13,originX:94,originY:75,brightness:.52,mobileX:100,mobileY:70,mobileScale:1.09,mobileOriginX:97,mobileOriginY:75},
  SWHC:{x:100,y:74,scale:1.12,originX:94,originY:77,brightness:.52,mobileX:100,mobileY:72,mobileScale:1.09,mobileOriginX:97,mobileOriginY:77},
  SAGF:{x:100,y:68,scale:1.10,originX:93,originY:71,brightness:.51,mobileX:100,mobileY:66,mobileScale:1.07,mobileOriginX:97,mobileOriginY:72},
  SAGC:{x:100,y:69,scale:1.16,originX:94,originY:73,brightness:.52,mobileX:100,mobileY:67,mobileScale:1.11,mobileOriginX:97,mobileOriginY:74},
  SAHF:{x:100,y:67,scale:1.08,originX:93,originY:70,brightness:.50,mobileX:100,mobileY:65,mobileScale:1.06,mobileOriginX:97,mobileOriginY:71},
  SAHC:{x:100,y:69,scale:1.09,originX:93,originY:72,brightness:.51,mobileX:100,mobileY:67,mobileScale:1.06,mobileOriginX:97,mobileOriginY:73}
};
let queued=false,archiveDataPromise=null;
const imageWarmups=new Map();
const cardBlobWarmups=new Map();
const classicalCardWarmups=new Map();
const elementLoads=new WeakMap();
function api(){return window.TraderDNAShareCard||null}
function data(){return api()?.data?.()||null}
function cardPath(code){
  const value=String(code||'').trim().toUpperCase();
  if(!CODES.has(value))throw new Error('Unknown Trader DNA identity: '+value);
  return `${CARD_BASE}/${value}.webp`;
}
function heroPath(code){
  const value=String(code||'').trim().toUpperCase();
  if(!CODES.has(value))throw new Error('Unknown Trader DNA identity: '+value);
  return `${HERO_BASE}/${value}.webp`;
}
function absolute(path){return new URL(path,location.href).href}
function warmImage(path,priority='auto'){
  const src=absolute(path);
  if(imageWarmups.has(src))return imageWarmups.get(src);
  const image=new Image();
  image.decoding='async';
  image.fetchPriority=priority;
  const promise=new Promise((resolve,reject)=>{
    const finish=()=>{
      const decoded=typeof image.decode==='function'?image.decode():Promise.resolve();
      decoded.catch(()=>{}).finally(()=>resolve(image));
    };
    image.onload=finish;
    image.onerror=reject;
    image.src=src;
    if(image.complete&&image.naturalWidth)finish();
  }).catch(error=>{imageWarmups.delete(src);throw error});
  imageWarmups.set(src,promise);
  return promise;
}
function loadImage(image,src){
  const pending=elementLoads.get(image);
  if(pending?.src===src)return pending.promise;
  const promise=new Promise((resolve,reject)=>{
    const finish=()=>{
      if(image.src!==src){image.src=src;return}
      const decoded=typeof image.decode==='function'?image.decode():Promise.resolve();
      decoded.catch(()=>{}).finally(resolve);
    };
    image.onload=finish;
    image.onerror=()=>{if(image.src!==src)image.src=src;else reject()};
    if(image.src!==src)image.src=src;
    else if(image.complete&&image.naturalWidth)finish();
  });
  elementLoads.set(image,{src,promise});
  const clear=()=>{if(elementLoads.get(image)?.promise===promise)elementLoads.delete(image)};
  promise.then(clear,clear);
  return promise;
}
function archiveData(){
  if(!archiveDataPromise){
    archiveDataPromise=Promise.all([
      fetch(TYPE_DATA,{cache:'force-cache'}).then(response=>response.ok?response.json():{}),
      fetch(PORTRAIT_DATA,{cache:'force-cache'}).then(response=>response.ok?response.json():{})
    ]).catch(()=>[{},{}]);
  }
  return archiveDataPromise;
}
function classicalVerse(types,code,script='hant'){
  const override=CLASSICAL_VERSE_OVERRIDES[code]?.[script];
  if(override)return override;
  return script==='hans'?(types?.[code]?.classicalVerseHans||types?.[code]?.classicalVerse):types?.[code]?.classicalVerse;
}
async function warmArchive(code){
  const [types,portraits]=await archiveData();
  const people=types?.[code]?.people||[];
  await Promise.allSettled(people.map(entry=>{
    const name=String(entry).split('｜')[0].trim();
    const source=portraits?.[name];
    return source?.cardUrl||source?.url?warmImage(source.cardUrl||source.url):null;
  }));
}
function warmIdentity(code){
  const value=String(code||'').trim().toUpperCase();
  if(!CODES.has(value))return;
  warmImage(heroPath(value),'high').catch(()=>{});
  warmImage(cardPath(value),'high').catch(()=>{});
  cardBlob(value).catch(()=>{});
  warmArchive(value).catch(()=>{});
}
function warmSavedIdentity(){
  try{warmIdentity(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')?.completedRecord?.dna)}catch{}
}
function applyHeroFrame(figure,code){
  const frame=HERO_FRAME[code];
  if(!frame)return;
  const values={
    '--hero-x':frame.x+'%','--hero-y':frame.y+'%','--hero-scale':frame.scale,
    '--hero-enter-scale':frame.scale+.1,'--hero-origin-x':frame.originX+'%',
    '--hero-origin-y':frame.originY+'%','--hero-brightness':frame.brightness,
    '--hero-x-mobile':frame.mobileX+'%','--hero-y-mobile':frame.mobileY+'%',
    '--hero-scale-mobile':frame.mobileScale,'--hero-enter-scale-mobile':frame.mobileScale+.08,
    '--hero-origin-x-mobile':frame.mobileOriginX+'%','--hero-origin-y-mobile':frame.mobileOriginY+'%'
  };
  Object.entries(values).forEach(([name,value])=>figure.style.setProperty(name,value));
}
async function cardBlob(code){
  if(cardBlobWarmups.has(code))return cardBlobWarmups.get(code);
  const url=cardPath(code);
  const promise=fetch(url,{cache:'force-cache'}).then(async response=>{
    if(!response.ok)throw new Error(`Identity Edition asset missing: ${code}`);
    const blob=await response.blob();
    if(!blob.type.startsWith('image/'))throw new Error('Identity Edition asset is not an image');
    return {url,blob};
  }).catch(error=>{cardBlobWarmups.delete(code);throw error});
  cardBlobWarmups.set(code,promise);
  return promise;
}
function verseLines(context,text,maxWidth){
  const clauses=String(text||'').match(/[^，。！？；]+[，。！？；]?/g)||[];
  const lines=[];
  let line='';
  clauses.forEach(clause=>{
    const candidate=line+clause;
    if(line&&context.measureText(candidate).width>maxWidth){lines.push(line);line=clause}
    else line=candidate;
  });
  if(line)lines.push(line);
  if(lines.length<=2)return lines;
  const compact=[];
  let value='';
  Array.from(String(text||'')).forEach(character=>{
    if(value&&context.measureText(value+character).width>maxWidth){compact.push(value);value=character}
    else value+=character;
  });
  if(value)compact.push(value);
  return compact;
}
async function classicalCard(code){
  const value=String(code||'').trim().toUpperCase();
  if(classicalCardWarmups.has(value))return classicalCardWarmups.get(value);
  const promise=Promise.all([warmImage(cardPath(value),'high'),archiveData()]).then(async([source,[types]])=>{
    const verse=classicalVerse(types,value,'hans');
    if(!verse)return cardBlob(value);
    const canvas=document.createElement('canvas');
    canvas.width=source.naturalWidth||1080;
    canvas.height=source.naturalHeight||1350;
    const context=canvas.getContext('2d',{alpha:false});
    context.drawImage(source,0,0,canvas.width,canvas.height);
    const scale=canvas.width/1080;
    const sample=context.getImageData(Math.round(88*scale),Math.round(558*scale),Math.max(1,Math.round(12*scale)),Math.max(1,Math.round(12*scale))).data;
    let red=0,green=0,blue=0,count=0;
    for(let index=0;index<sample.length;index+=4){red+=sample[index];green+=sample[index+1];blue+=sample[index+2];count++}
    red=Math.round(red/count);green=Math.round(green/count);blue=Math.round(blue/count);
    const paper=context.createLinearGradient(0,558*scale,0,690*scale);
    paper.addColorStop(0,`rgb(${red},${green},${blue})`);
    paper.addColorStop(1,`rgb(${Math.max(0,red-1)},${Math.max(0,green-1)},${Math.max(0,blue-2)})`);
    context.fillStyle=paper;
    context.fillRect(66*scale,558*scale,500*scale,132*scale);
    const length=Array.from(verse).length;
    const size=(length>22?32:length>17?35:length>12?39:42)*scale;
    context.font=`600 ${size}px "Songti TC","STSong","Noto Serif CJK SC",serif`;
    context.fillStyle='#0a0a09';
    context.textBaseline='alphabetic';
    const lines=verseLines(context,verse,468*scale).slice(0,2);
    const lineHeight=(lines.length>1?57:60)*scale;
    const firstBaseline=(lines.length>1?607:628)*scale;
    lines.forEach((line,index)=>context.fillText(line,77*scale,firstBaseline+index*lineHeight));
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Identity Edition render failed')),'image/webp',.96));
    return {url:cardPath(value),blob};
  }).catch(error=>{classicalCardWarmups.delete(value);throw error});
  classicalCardWarmups.set(value,promise);
  return promise;
}
function warmRevealIdentity(){
  const code=(root?.querySelector('.reveal-code')||root?.querySelector('.result-hero>.code'))?.textContent?.trim()?.toUpperCase();
  warmIdentity(code);
}
function prefetchResolvedIdentity(){
  try{
    if(typeof window.scores!=='function'||typeof window.codeFrom!=='function')return;
    const {dimScore}=window.scores();
    const code=window.codeFrom(dimScore);
    if(!CODES.has(code))return;
    warmIdentity(code);
  }catch{}
}
function mountQuestionContinuity(){
  const wrap=root?.querySelector('.quiz-wrap');
  if(!wrap)return;
  const q=Number(wrap.querySelector('.question-index')?.textContent?.replace(/\D/g,''))||0;
  if(q)wrap.dataset.scan01Question=String(q).padStart(2,'0');
  if(q===18)wrap.classList.add('scan01-final-question');
  if(wrap.dataset.scan01MotionReady==='1')return;
  wrap.dataset.scan01MotionReady='1';
  wrap.classList.add('scan01-question-enter');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(wrap.isConnected)wrap.classList.add('is-settled')}));
}
function mountRevealCharacter(){
  const reveal=root?.querySelector('.reveal.d4-reveal');
  const material=reveal?.querySelector('.d4-reveal-material');
  const code=reveal?.querySelector('.reveal-code')?.textContent?.trim()?.toUpperCase();
  if(!material||!CODES.has(code)||material.querySelector('.scan01-reveal-character'))return;
  const figure=document.createElement('figure');
  figure.className='scan01-reveal-character';
  figure.setAttribute('aria-hidden','true');
  applyHeroFrame(figure,code);
  figure.innerHTML='<img alt="" decoding="async">';
  const image=figure.querySelector('img');
  image.fetchPriority='high';
  image.src=absolute(heroPath(code));
  image.onerror=()=>figure.remove();
  material.appendChild(figure);
}
function mountHero(result){
  const hero=result?.querySelector('.result-hero');
  if(!hero)return;
  hero.dataset.authority='character-reveal';
  const code=hero.querySelector('.code')?.textContent?.trim()?.toUpperCase();
  if(!CODES.has(code))return;
  const hook=hero.querySelector(':scope>.hook');
  if(hook&&hook.dataset.classicalVerse!==code){
    hook.dataset.classicalVerse=code;
    archiveData().then(([types])=>{
      const verse=classicalVerse(types,code);
      if(verse&&hook.isConnected&&hero.querySelector(':scope>.code')?.textContent?.trim()?.toUpperCase()===code){
        hook.textContent=verse;
        hook.dataset.copyRole='classical-verse';
      }
    }).catch(()=>{});
  }
  let figure=hero.querySelector('.scan01-authority-character');
  if(!figure){
    figure=document.createElement('figure');
    figure.className='scan01-authority-character';
    figure.setAttribute('aria-hidden','true');
    figure.innerHTML='<img alt="" decoding="async" fetchpriority="high">';
    hero.appendChild(figure);
  }
  figure.dataset.code=code;
  applyHeroFrame(figure,code);
  const image=figure.querySelector('img');
  const src=absolute(heroPath(code));
  if(figure.dataset.ready==='1'&&image.src===src)return;
  delete figure.dataset.ready;
  loadImage(image,src).then(()=>{
    if(image.src===src){figure.dataset.ready='1';hero.dataset.characterReady='1'}
  }).catch(()=>figure.remove());
}
function cleanLegacyShare(studio){
  studio.querySelectorAll('.cinema-share-cover,.cinema-system-share').forEach(node=>node.remove());
  studio.querySelectorAll('[data-share-format]').forEach(button=>button.removeAttribute('data-share-format'));
  const generate=studio.querySelector('.v3-share-generate');
  if(generate){generate.classList.remove('v3-share-generate');generate.hidden=true}
  const native=studio.querySelector('.v3-share-native');
  if(native){
    native.classList.remove('v3-share-native');
    native.classList.add('scan01-authority-native');
    native.innerHTML='分享 / 保存身份卡 <span>↗</span>';
  }
}
function mountCardDisplay(stage){
  if(!stage)return null;
  let shell=stage.querySelector(':scope > .identity-card-shell');
  if(!shell){
    const image=stage.querySelector(':scope > img');
    if(!image)return null;
    const shadow=document.createElement('div');
    shadow.className='identity-card-depth-shadow';
    shadow.setAttribute('aria-hidden','true');
    shell=document.createElement('div');
    shell.className='identity-card-shell';
    image.classList.add('identity-card-master');
    stage.insertBefore(shadow,image);
    stage.insertBefore(shell,image);
    shell.append(image);
    shell.insertAdjacentHTML('beforeend','<div class="identity-card-foil" aria-hidden="true"></div><div class="identity-card-specular" aria-hidden="true"></div>');
  }
  if(stage.dataset.identityTiltBound!=='1'){
    stage.dataset.identityTiltBound='1';
    let frame=0,box=null,pointerX=.5,pointerY=.5;
    const commit=()=>{
      frame=0;
      stage.style.setProperty('--share-rx',`${((.5-pointerY)*8).toFixed(2)}deg`);
      stage.style.setProperty('--share-ry',`${((pointerX-.5)*12).toFixed(2)}deg`);
      stage.style.setProperty('--glare-x',`${(pointerX*100).toFixed(1)}%`);
      stage.style.setProperty('--glare-y',`${(pointerY*100).toFixed(1)}%`);
      stage.style.setProperty('--shadow-x',`${((.5-pointerX)*12).toFixed(1)}px`);
      stage.style.setProperty('--shadow-y',`${((.5-pointerY)*8).toFixed(1)}px`);
      stage.style.setProperty('--foil-angle',`${(108+(pointerX-.5)*18).toFixed(1)}deg`);
    };
    const move=event=>{
      if(event.pointerType==='touch'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      box=box||stage.getBoundingClientRect();
      pointerX=Math.max(0,Math.min(1,(event.clientX-box.left)/Math.max(1,box.width)));
      pointerY=Math.max(0,Math.min(1,(event.clientY-box.top)/Math.max(1,box.height)));
      stage.dataset.identityTiltActive='1';
      if(!frame)frame=requestAnimationFrame(commit);
    };
    const reset=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=0;box=null;
      delete stage.dataset.identityTiltActive;
      stage.style.setProperty('--share-rx','0deg');stage.style.setProperty('--share-ry','0deg');
      stage.style.setProperty('--glare-x','50%');stage.style.setProperty('--glare-y','42%');
      stage.style.setProperty('--shadow-x','0px');stage.style.setProperty('--shadow-y','0px');
      stage.style.setProperty('--foil-angle','108deg');
    };
    stage.addEventListener('pointerenter',()=>{box=stage.getBoundingClientRect()},{passive:true});
    stage.addEventListener('pointermove',move,{passive:true});
    stage.addEventListener('pointerleave',reset,{passive:true});
  }
  return shell.querySelector('.identity-card-master');
}
async function buildStatic(){
  const studio=root?.querySelector('.v3-share-studio');
  const d=data();
  if(!studio||!d)return null;
  const stage=studio.querySelector('.v3-share-stage');
  const image=mountCardDisplay(stage);
  if(!stage||!image)return null;
  studio.dataset.authority='identity-edition';
  studio.dataset.format='4:5';
  studio.dataset.cinemaExport='authority';
  stage.dataset.shareAuthority='identity-edition-master';
  cleanLegacyShare(studio);
  image.alt=`Trader DNA ${d.code} · ${d.name} Identity Edition`;
  image.dataset.identityCode=d.code;
  stage.setAttribute('aria-busy','true');
  const {blob}=await classicalCard(d.code);
  if(studio._authorityCode!==d.code||!studio._shareBlob||!studio._shareUrl){
    if(studio._shareUrl)URL.revokeObjectURL(studio._shareUrl);
    studio._shareBlob=blob;
    studio._shareUrl=URL.createObjectURL(blob);
    studio._shareFormat='4:5';
    studio._authorityCode=d.code;
  }
  await loadImage(image,studio._shareUrl);
  stage.classList.add('is-ready');
  stage.removeAttribute('aria-busy');
  return {blob:studio._shareBlob,url:studio._shareUrl};
}
async function shareStatic(){
  const studio=root?.querySelector('.v3-share-studio');
  const d=data();
  if(!studio||!d)return;
  if(!studio._shareBlob||studio._authorityCode!==d.code)await buildStatic();
  const blob=studio._shareBlob;
  if(!blob)return;
  const file=new File([blob],`82TRADE-${d.code}-Identity-Edition-4x5.webp`,{type:blob.type||'image/webp'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{
      await navigator.share({files:[file],title:`${d.code} · ${d.name}`,text:'82TRADE / Trader DNA'});
      return;
    }catch(error){if(error?.name==='AbortError')return}
  }
  const a=document.createElement('a');
  const downloadUrl=URL.createObjectURL(blob);
  a.href=downloadUrl;
  a.download=file.name;
  a.rel='noopener';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(downloadUrl),1000);
}
function installAuthorityApi(){
  const current=api();
  if(!current?.data)return false;
  if(current.build===buildStatic&&current.share===shareStatic)return true;
  window.TraderDNAShareCard={...current,render:null,build:buildStatic,share:shareStatic,cardPath};
  return true;
}
function mountShare(result){
  const studio=result?.querySelector('.v3-share-studio');
  if(!studio)return;
  cleanLegacyShare(studio);
  mountCardDisplay(studio.querySelector('.v3-share-stage'));
  const copy=studio.querySelector('.v3-share-studio-copy');
  const title=copy?.querySelector('h3');
  const paragraph=copy?.querySelector('p');
  if(title)title.textContent='你的正式身份卡。';
  if(paragraph)paragraph.textContent='這裡直接使用對應 DNA 的 4:5 Identity Edition 母版；分享出去的，就是這一張。';
  const note=studio.querySelector('.v3-share-tools>span');
  if(note){note.classList.add('scan01-authority-note');note.textContent='PUBLIC / 4:5 IDENTITY EDITION · 私人提醒不進入分享卡。'}
  const button=studio.querySelector('.scan01-authority-native');
  if(button&&!button.dataset.authorityBound){
    button.dataset.authorityBound='1';
    button.addEventListener('click',event=>{event.preventDefault();shareStatic().catch(console.error)});
  }
  installAuthorityApi();
  buildStatic().catch(console.error);
}
function sync(){
  queued=false;
  mountQuestionContinuity();
  warmRevealIdentity();
  mountRevealCharacter();
  const result=root?.querySelector('.result');
  if(!result)return;
  result.dataset.authorityPreview='1';
  mountHero(result);
  mountShare(result);
}
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(sync);
}
if(root){
  warmSavedIdentity();
  root.addEventListener('click',event=>{
    const option=event.target.closest('.quiz-wrap .option');
    if(!option||option.disabled)return;
    const wrap=option.closest('.quiz-wrap');
    wrap?.classList.add('scan01-question-commit');
    option.classList.add('scan01-choice-commit');
    const q=Number(wrap?.querySelector('.question-index')?.textContent?.replace(/\D/g,''))||0;
    if(q===18){
      wrap?.classList.add('scan01-final-lock');
      queueMicrotask(prefetchResolvedIdentity);
    }
  },{capture:true});
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-v4-ready']});
}
addEventListener('pageshow',schedule);
schedule();
})();
