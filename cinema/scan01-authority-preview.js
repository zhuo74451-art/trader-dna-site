(()=>{'use strict';
const root=document.querySelector('#view');
const CARD_BASE='./cinema/assets/identity-cards';
const HERO_BASE='./cinema/assets/hero-characters';
const CODES=new Set(['IWGF','IWGC','IWHF','IWHC','IAGF','IAGC','IAHF','IAHC','SWGF','SWGC','SWHF','SWHC','SAGF','SAGC','SAHF','SAHC']);
let queued=false,warmCode='';
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
async function cardBlob(code){
  const url=cardPath(code);
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw new Error(`Identity Edition asset missing: ${code}`);
  const blob=await response.blob();
  if(!blob.type.startsWith('image/'))throw new Error('Identity Edition asset is not an image');
  return {url,blob};
}
function warmRevealIdentity(){
  const code=(root?.querySelector('.reveal-code')||root?.querySelector('.result-hero>.code'))?.textContent?.trim()?.toUpperCase();
  if(!CODES.has(code)||warmCode===code)return;
  warmCode=code;
  const image=new Image();
  image.decoding='async';
  image.src=absolute(heroPath(code));
}
function mountHero(result){
  const hero=result?.querySelector('.result-hero');
  if(!hero)return;
  hero.dataset.authority='character-reveal';
  const code=hero.querySelector('.code')?.textContent?.trim()?.toUpperCase();
  if(!CODES.has(code))return;
  let figure=hero.querySelector('.scan01-authority-character');
  if(!figure){
    figure=document.createElement('figure');
    figure.className='scan01-authority-character';
    figure.setAttribute('aria-hidden','true');
    figure.innerHTML='<img alt="" decoding="async" fetchpriority="high">';
    hero.appendChild(figure);
  }
  const image=figure.querySelector('img');
  const src=absolute(heroPath(code));
  const ready=()=>{figure.dataset.ready='1';hero.dataset.characterReady='1'};
  if(image.src!==src){
    delete figure.dataset.ready;
    image.onload=ready;
    image.src=src;
  }else if(image.complete&&image.naturalWidth)ready();
  image.onerror=()=>figure.remove();
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
async function buildStatic(){
  const studio=root?.querySelector('.v3-share-studio');
  const d=data();
  if(!studio||!d)return null;
  const stage=studio.querySelector('.v3-share-stage');
  const image=stage?.querySelector(':scope > img');
  if(!stage||!image)return null;
  studio.dataset.authority='identity-edition';
  studio.dataset.format='4:5';
  studio.dataset.cinemaExport='authority';
  stage.dataset.shareAuthority='identity-edition-master';
  cleanLegacyShare(studio);
  const src=absolute(cardPath(d.code));
  if(image.src!==src)image.src=src;
  image.alt=`Trader DNA ${d.code} · ${d.name} Identity Edition`;
  image.dataset.identityCode=d.code;
  stage.classList.add('is-ready');
  stage.removeAttribute('aria-busy');
  if(studio._authorityCode!==d.code||!studio._shareBlob){
    const {blob}=await cardBlob(d.code);
    studio._shareBlob=blob;
    studio._shareFormat='4:5';
    studio._authorityCode=d.code;
  }
  return {blob:studio._shareBlob,url:src};
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
  a.href=cardPath(d.code);
  a.download=file.name;
  a.rel='noopener';
  a.click();
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
  warmRevealIdentity();
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
if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-v4-ready']});
addEventListener('pageshow',schedule);
schedule();
})();