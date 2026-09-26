(()=>{'use strict';
const view=document.querySelector('#view');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let busy=false,queued=false;

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

function resultData(result){
  return {
    code:result.querySelector('.result-hero .code')?.textContent?.trim()||'DNA',
    name:result.querySelector('.result-hero .identity')?.textContent?.trim()||'TRADER DNA',
    hook:result.querySelector('.result-hero .hook')?.textContent?.trim()||''
  };
}

function mountFlip(result){
  const plate=result.querySelector('.v47-identity-plate');
  const mark=plate?.querySelector(':scope > .v4-result-mark');
  if(!plate||!mark||plate.dataset.rsMounted==='1')return;
  plate.dataset.rsMounted='1';
  plate.dataset.rsFlipped='0';

  const rotor=document.createElement('div');
  rotor.className='rs-card-rotor';
  const front=document.createElement('div');
  front.className='rs-card-face rs-card-front';
  const back=document.createElement('div');
  back.className='rs-card-face rs-card-back';

  const data=resultData(result);
  back.innerHTML=`
    <div class="rs-back-meta"><span>82TRADE / TRADER DNA</span><span>IDENTITY BACK / PUBLIC</span></div>
    <div class="rs-back-code">${escapeHtml(data.code)}</div>
    <div class="rs-back-name">${escapeHtml(data.name)}</div>
    <p class="rs-back-hook">${escapeHtml(data.hook)}</p>
    <div class="rs-back-foot"><span>18 DECISIONS / SEALED</span><span>SCAN 01 / IDENTITY FORM</span></div>`;

  plate.appendChild(rotor);
  front.appendChild(mark);
  rotor.append(front,back);

  const control=document.createElement('button');
  control.type='button';
  control.className='rs-flip-control';
  control.textContent='IDENTITY BACK ↗';
  control.setAttribute('aria-pressed','false');
  control.addEventListener('click',()=>{
    const next=plate.dataset.rsFlipped!=='1';
    plate.dataset.rsFlipped=next?'1':'0';
    control.textContent=next?'RETURN FRONT ↙':'IDENTITY BACK ↗';
    control.setAttribute('aria-pressed',String(next));
  });
  result.querySelector('.v47-identity-stack')?.appendChild(control);
}

function resetFront(result){
  const plate=result.querySelector('.v47-identity-plate');
  const control=result.querySelector('.rs-flip-control');
  if(plate)plate.dataset.rsFlipped='0';
  if(control){control.textContent='IDENTITY BACK ↗';control.setAttribute('aria-pressed','false')}
}

function cloneForFlight(mark,rect){
  const clone=mark.cloneNode(true);
  clone.classList.add('rs-flight-card');
  Object.assign(clone.style,{
    left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'
  });
  document.body.appendChild(clone);
  return clone;
}

function waitForScroll(target,timeout=1300){
  return new Promise(resolve=>{
    const started=performance.now();
    const tick=()=>{
      const r=target.getBoundingClientRect();
      if(Math.abs((r.top+r.height/2)-innerHeight/2)<40||performance.now()-started>timeout)return resolve();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function travelToShare(result){
  if(busy)return;
  const mark=result.querySelector('.v4-result-mark');
  const studio=result.querySelector('.v3-share-studio');
  const target=studio?.querySelector('.v3-share-stage');
  if(!mark||!studio||!target)return;

  busy=true;
  resetFront(result);
  target.dataset.rsTarget='1';

  if(reduce){
    studio.scrollIntoView({behavior:'auto',block:'center'});
    await window.TraderDNAPublish?.start?.('4:5');
    target.removeAttribute('data-rs-target');
    busy=false;
    return;
  }

  document.body.dataset.rsTravelling='1';
  const first=mark.getBoundingClientRect();
  const flight=cloneForFlight(mark,first);
  mark.style.visibility='hidden';

  studio.scrollIntoView({behavior:'smooth',block:'center'});
  await waitForScroll(studio);
  const tr=target.getBoundingClientRect();
  const ratio=Math.min((tr.width*.78)/first.width,(tr.height*.78)/first.height);
  const finalW=first.width*ratio,finalH=first.height*ratio;
  const finalX=tr.left+(tr.width-finalW)/2,finalY=tr.top+(tr.height-finalH)/2;

  const anim=flight.animate([
    {transform:'translate3d(0,0,0) scale(1)',opacity:1},
    {transform:`translate3d(${(finalX-first.left).toFixed(1)}px,${(finalY-first.top).toFixed(1)}px,0) scale(${ratio.toFixed(4)})`,opacity:1}
  ],{duration:720,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});

  await anim.finished.catch(()=>{});
  flight.remove();
  mark.style.visibility='';
  delete document.body.dataset.rsTravelling;

  await window.TraderDNAPublish?.start?.('4:5');
  target.removeAttribute('data-rs-target');
  busy=false;
}

function mountBridge(result){
  if(result.querySelector('.rs-publish-bridge'))return;
  const hook=result.querySelector('.result-hero .hook');
  if(!hook)return;
  const button=document.createElement('button');
  button.type='button';
  button.className='rs-publish-bridge';
  button.innerHTML='<span>GENERATE SHARE ARTIFACT</span><i>↘</i>';
  button.addEventListener('click',()=>travelToShare(result).catch(()=>{busy=false;delete document.body.dataset.rsTravelling}));
  hook.insertAdjacentElement('afterend',button);
}

function mount(){
  queued=false;
  const result=view?.querySelector('.result[data-v4-ready="1"],.result');
  if(!result)return;
  if(!result.querySelector('.v47-identity-plate')||!result.querySelector('.v3-share-studio'))return;
  result.dataset.rsCandidate='1';
  mountFlip(result);
  mountBridge(result);
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(mount)}
new MutationObserver(queue).observe(view,{subtree:true,childList:true,attributes:true,attributeFilter:['data-v4-ready']});
addEventListener('pageshow',queue);
queue();
})();