(()=>{
'use strict';

const CARD_BASE='assets/identity-cards';
const CODES=new Set(['IWGF','IWGC','IWHF','IWHC','IAGF','IAGC','IAHF','IAHC','SWGF','SWGC','SWHF','SWHC','SAGF','SAGC','SAHF','SAHC']);
let activeUrl=null;

function data(){
  return window.TraderDNAShareCard?.data?.()||null;
}
function cardPath(code){
  const normalized=String(code||'').trim().toUpperCase();
  if(!CODES.has(normalized))throw new Error('Unknown Trader DNA identity');
  return `${CARD_BASE}/${normalized}.webp`;
}
function studio(){
  return document.querySelector('.v3-share-studio');
}
function stage(){
  return studio()?.querySelector('.v3-share-stage')||null;
}
async function loadAuthorityBlob(code){
  const url=cardPath(code);
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw new Error(`Identity card asset missing: ${code}`);
  const blob=await response.blob();
  if(!blob.type.startsWith('image/'))throw new Error('Identity card asset is not an image');
  return {blob,url};
}
async function build(){
  const root=studio();
  const current=data();
  if(!root||!current)return null;
  root.dataset.format='4:5';
  root.dataset.cardAuthority='static-master';
  const visual=stage();
  visual?.setAttribute('aria-busy','true');
  try{
    const {blob}=await loadAuthorityBlob(current.code);
    if(activeUrl)URL.revokeObjectURL(activeUrl);
    activeUrl=URL.createObjectURL(blob);
    const img=visual?.querySelector('img');
    if(img){
      img.src=activeUrl;
      img.alt=`Trader DNA ${current.code} · ${current.name} 身份分享卡`;
      img.dataset.identityCode=current.code;
    }
    visual?.classList.add('is-ready','is-authority-card');
    visual?.removeAttribute('aria-busy');
    root._shareBlob=blob;
    root._shareFormat='4:5';
    return {blob,url:activeUrl};
  }catch(error){
    visual?.removeAttribute('aria-busy');
    if(visual)visual.dataset.error=error.message;
    throw error;
  }
}
async function share(){
  const root=studio();
  if(!root)return;
  if(!root._shareBlob)await build();
  const current=data();
  const file=new File([root._shareBlob],`82TRADE-TraderDNA-${current?.code||'DNA'}-4x5.webp`,{type:root._shareBlob.type||'image/webp'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{
      await navigator.share({files:[file],title:`${current?.code||''} · ${current?.name||'Trader DNA'}`,text:'82TRADE / Trader DNA'});
      return;
    }catch(error){
      if(error?.name==='AbortError')return;
    }
  }
  const a=document.createElement('a');
  a.href=activeUrl;
  a.download=file.name;
  a.rel='noopener';
  a.click();
}
function intercept(event){
  const target=event.target?.closest?.('[data-share-format],.v3-share-generate,.v3-share-native');
  if(!target)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if(target.matches('[data-share-format]')&&target.dataset.shareFormat!=='4:5')return;
  if(target.matches('.v3-share-native')){share().catch(console.error);return}
  build().catch(console.error);
}
let queued=false;
function autoBuild(){
  const root=studio();
  if(!root||root.dataset.authorityAuto==='1'||!data())return;
  root.dataset.authorityAuto='1';
  requestAnimationFrame(()=>build().catch(()=>{root.dataset.authorityAuto='0'}));
}
function install(){
  const api=window.TraderDNAShareCard;
  if(!api?.data)return requestAnimationFrame(install);
  window.TraderDNAShareCard={...api,render:null,build,share,cardPath};
  document.addEventListener('click',intercept,true);
  new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;autoBuild()});
  }).observe(document.querySelector('#view')||document.body,{childList:true,subtree:true});
  autoBuild();
}
addEventListener('beforeunload',()=>{if(activeUrl)URL.revokeObjectURL(activeUrl)});
install();
})();