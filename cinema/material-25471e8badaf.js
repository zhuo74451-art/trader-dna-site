/* DOM presentation adapter. No changes to questions, scores or saved answers. */
(()=>{'use strict';
const root=document.querySelector('#view'),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let manifest={},queued=false,exportURL=null,buildId=0;
const text={note:'人物映射參考其公開決策風格，不代表本人參與測驗或背書。',example:'此處為人物檔案示例，並非你的測驗結果。完成選擇後，才會顯示與你同型的人物。'};
fetch('./cinema/portraits-8c1a1b5f0578.json').then(r=>r.json()).then(m=>{manifest=m;queue()}).catch(()=>{});
const terrain=new Image();terrain.src='./cinema/assets/terrain.webp';
function types(){return typeof TYPES==='object'?TYPES:{}}
function parse(raw){const a=String(raw).split('\n'),n=(a.shift()||'').split('｜');return {name:n[0]||'',local:n[1]||'',desc:a.join(' ')}}
function header(example=false){return `<header class="archive-header"><div><span class="eyebrow">${example?'THE ARCHIVE / SELECTED STUDIES':'SAME TYPE / DIFFERENT LIVES'}</span><h2>${example?'不同的人，相似的決定。':'與誰同類'}</h2><p>${example?'有人先等到對的位置，有人先走進未知。你的選擇，也有自己的紋路。':'不同的人生，相似的決策習慣。這是風格映射，不是績效預測。'}</p></div><div class="archive-side">DIFFERENT PATHS.<br>SIMILAR DECISIONS.<br><br>82TRADE / ARCHIVE</div></header>`}
function rawCard(p,i){return `<article class="person" data-refined="1"><figure class="v3-person-portrait" data-person="${e(p.name)}"><div class="v3-person-index">${String(i+1).padStart(2,'0')}</div><div class="v3-person-fallback"><span>TRADER ARCHIVE</span><b>${e(p.name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</b><small>PORTRAIT STUDY</small></div><img alt="${e(p.name)}" loading="lazy"><figcaption class="v3-person-source"></figcaption></figure><div class="v3-person-copy"><div class="v3-person-name">${e(p.name)}<small>${e(p.local)}</small></div><div class="v3-person-desc">${e(p.desc)}</div></div></article>`}
function personData(person){const n=person.querySelector('.v3-person-name');return {name:n?.childNodes[0]?.textContent.trim()||'',local:n?.querySelector('small')?.textContent||'',desc:person.querySelector('.v3-person-desc')?.textContent||''}}
function showModal(html,label){let d=document.querySelector('.cinema-dialog');if(!d){d=document.createElement('dialog');d.className='cinema-dialog';d.innerHTML='<button class="dialog-close" type="button" aria-label="關閉">×</button><div class="dialog-body"></div>';document.body.appendChild(d);d.querySelector('button').onclick=()=>d.close();d.onclick=event=>{if(event.target===d)d.close()}}d.setAttribute('aria-label',label);d.querySelector('.dialog-body').innerHTML=html;d.showModal()}
function about(){showModal('<span class="eyebrow">ABOUT THE ASSESSMENT</span><h2>不是標籤。<br>是看見自己的方式。</h2><p>Trader DNA 是一次關於決策習慣的自我探索。先回答 18 個選擇，看見第一層輪廓；也可以繼續完整 54 題。</p><p>請選更像真實自己的那一邊，不用找標準答案。這不是心理診斷或投資建議，也不測量報酬能力、風險承受能力。</p><small>你的答題進度保存在這台裝置的瀏覽器。分享卡不包含私人提醒；清除瀏覽器資料會刪除本機進度。</small>','關於測驗')}
function hydrate(person){const f=person.querySelector('.v3-person-portrait'),im=f?.querySelector('img');if(!im)return;const name=f.dataset.person||personData(person).name,m=manifest[name];if(m?.kind!=='image')return;const src=new URL(m.url,location.href).href;if(im.src!==src){im.onload=()=>{f.classList.add('has-image');f.classList.remove('is-fallback')};im.onerror=()=>f.classList.add('is-fallback');im.src=src;im.alt=name;im.loading=person.closest('.examples')?'lazy':'eager';im.decoding='async'}if(im.complete&&im.naturalWidth){f.classList.add('has-image');f.classList.remove('is-fallback')}const credit=f.querySelector('figcaption');if(credit&&!credit.dataset.cinema){credit.dataset.cinema='1';credit.textContent=[m.credit,m.license].filter(Boolean).join(' / ')||m.source||'ARCHIVE PORTRAIT'}}
function enrich(person){const copy=person.querySelector('.v3-person-copy');if(!copy)return;hydrate(person);if(copy.dataset.cinema)return;copy.dataset.cinema='1';const p=personData(person),idx=[...person.parentElement.children].indexOf(person)+1,ex=person.closest('.examples');copy.insertAdjacentHTML('afterbegin',`<div class="person-label">TRADER ARCHIVE<br>${String(idx).padStart(3,'0')} / ${ex?'SELECTED STUDY':'STYLE MAPPING'}</div>`);copy.insertAdjacentHTML('beforeend',`<div class="person-categories">${ex?'DECISION / IDENTITY / PATTERN':'SAME PATTERN / DIFFERENT PATH'}</div><button class="person-read" type="button" aria-label="閱讀 ${e(p.name)} 人物檔案">VIEW DOSSIER <span>↗</span></button>`);copy.querySelector('button').onclick=()=>{const m=manifest[p.name],src=person.querySelector('img')?.src,photo=!person.classList.contains('is-portrait-deferred')&&person.querySelector('.has-image:not(.is-fallback)');showModal(`${photo&&src?`<img src="${e(src)}" alt="${e(p.name)}">`:''}<span class="eyebrow">ARCHIVE / DECISION STYLE</span><h2>${e(p.name)}</h2><h3>${e(p.local)}</h3><p>${e(p.desc)}</p><small>${text.note}${m?.credit?'<br>PHOTO / '+e(m.credit):''}${m?.license?' / '+e(m.license):''}${m?.sourceUrl?`<br><a href="${e(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">PHOTO SOURCE ↗</a>`:''}</small>`,p.name)}}
function landing(){const hero=root.querySelector('.hero');if(!hero)return;const obj=hero.querySelector('.v3-hero-material');if(obj&&!obj.querySelector('.cinema-face'))obj.insertAdjacentHTML('beforeend','<div class="cinema-face"><img src="./cinema/assets/scan-study.webp" alt="" fetchpriority="high"></div><div class="cinema-scan-copy"><strong>IDENTITY<br>UNDER PRESSURE.</strong>NOT WHAT YOU SAY.<br>WHAT YOU REPEAT.</div><div class="cinema-scan-side">SAME<br>MARKETS.<br>A DIFFERENT<br>YOU.</div><i class="cinema-cross"></i>');if(!root.querySelector('.examples')&&Object.keys(types()).length){const people=Object.values(types()).flatMap(t=>t.people).map(parse);const selected=['Edward Thorp','David Tepper','Warren Buffett'].map(n=>people.find(p=>p.name===n)).filter(Boolean);const sec=document.createElement('section');sec.className='cinema-archive examples';sec.id='cinema-archive-examples';sec.innerHTML=header(true)+`<div class="people">${selected.map(rawCard).join('')}</div><div class="archive-note">${text.example}</div>`;hero.insertAdjacentElement('afterend',sec)}}
function result(){const r=root.querySelector('.result');if(!r||r.dataset.v4Ready!=='1')return;const ar=r.querySelector('.v4-same-type');if(ar&&!ar.classList.contains('cinema-archive')){ar.classList.add('cinema-archive');ar.insertAdjacentHTML('afterbegin',header());const orig=ar.querySelector(':scope>h3');if(orig)orig.hidden=true;ar.insertAdjacentHTML('beforeend',`<div class="archive-note">${text.note}</div>`)}const studio=r.querySelector('.v3-share-studio');if(studio&&!studio.dataset.cinema){studio.dataset.cinema='1';studio.querySelector('h3').innerHTML='<span>把這次身份，</span><span>發佈成一張</span><span>可以帶走的作品。</span>';mountShareCover(studio);studio.querySelector('.v3-share-native').innerHTML='保存 PNG <span>\u2193</span>';studio.querySelector('.v3-share-tools>span').textContent='保存完整尺寸的身份海報。只包含公開結果，不包含私人提醒。';studio.querySelector('.v3-share-studio-copy p').textContent='不只是一份結果，也是你的決策印記。私人提醒不會進入分享圖；保存屬於你的公開身份。';installShare();setTimeout(()=>build(studio.dataset.format||'4:5').catch(console.error),200)}r.dataset.cinemaReady='1'}
/* Inspectable physical surfaces: no touch-scroll hijack, no endless animation loop. */
function bindMaterial(node){
 if(!node||node.dataset.materialBound)return;node.dataset.materialBound='1';
 let box=null,frame=0,px=.5,py=.5;
 const reset=()=>{if(frame)cancelAnimationFrame(frame);frame=0;node.style.setProperty('--mat-rx','0deg');node.style.setProperty('--mat-ry','0deg')};
 node.addEventListener('pointerenter',()=>{box=node.getBoundingClientRect()},{passive:true});
 node.addEventListener('pointermove',ev=>{if(ev.pointerType==='touch'||matchMedia('(prefers-reduced-motion:reduce)').matches||node.dataset.inspect==='true')return;
   box=box||node.getBoundingClientRect();px=Math.max(0,Math.min(1,(ev.clientX-box.left)/box.width));py=Math.max(0,Math.min(1,(ev.clientY-box.top)/box.height));
   if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(!node.isConnected)return;node.style.setProperty('--mat-rx',`${((.5-py)*12).toFixed(2)}deg`);node.style.setProperty('--mat-ry',`${((px-.5)*20).toFixed(2)}deg`)});
 },{passive:true});node.addEventListener('pointerleave',reset,{passive:true});
}
function inspectButton(container,node){
 if(!container||!node||container.querySelector(':scope > .material-inspect'))return;
 const b=document.createElement('button');b.type='button';b.className='material-inspect';b.textContent='\u65cb\u8f49\u6aa2\u8996';b.setAttribute('aria-pressed','false');
 b.onclick=()=>{const on=node.dataset.inspect!=='true';node.dataset.inspect=String(on);b.setAttribute('aria-pressed',String(on));b.textContent=on?'\u56de\u5230\u6b63\u9762':'\u65cb\u8f49\u6aa2\u8996'};container.appendChild(b);
}
function materialSync(){
 const landingNode=root.querySelector('.v3-hero-material');bindMaterial(landingNode);inspectButton(root.querySelector('.hero-main'),landingNode);
 const identity=root.querySelector('.v47-identity-stack');bindMaterial(identity);inspectButton(root.querySelector('.result-hero'),identity);
 const stage=root.querySelector('.v3-share-stage');bindMaterial(stage);inspectButton(root.querySelector('.v3-share-studio-copy'),stage);
 root.querySelectorAll('.v3-person-portrait[data-person="Paul Tudor Jones"]').forEach(f=>{f.closest('.person')?.classList.add('is-portrait-deferred')});
 const publish=root.querySelector('.v3-share-generate');if(publish){const done=root.querySelector('.v3-share-studio')?.dataset.v48Publish==='published';const value=done?'\u5206\u4eab\u6d77\u5831\u5df2\u751f\u6210':'\u5c55\u958b\u5206\u4eab\u6d77\u5831';if(publish.dataset.materialText!==value){publish.dataset.materialText=value;publish.innerHTML=value+' <span>'+ (done?'\u2713':'\u2192')+'</span>'}}
}

function sync(){queued=false;landing();result();root.querySelectorAll('.person').forEach(enrich);materialSync();document.body.dataset.scene=root.querySelector('.result')?'result':root.querySelector('.quiz-wrap')?'question':root.querySelector('.reveal')?'reveal':'landing'}
function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}
new MutationObserver(queue).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-v4-ready']});queue();
document.querySelector('[data-about]')?.addEventListener('click',about);document.querySelector('[data-archive]')?.addEventListener('click',()=>{const a=root.querySelector('.cinema-archive');if(a)a.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});else about()});document.querySelector('[data-home]')?.addEventListener('click',()=>{if(typeof renderLanding==='function')renderLanding();scrollTo({top:0,behavior:'smooth'})});
/* Public export: actual current identity and signals; no private note or portraits. */
function wrap(ctx,s,w){const lines=[];let line='';for(const c of Array.from(String(s||''))){if(line&&ctx.measureText(line+c).width>w){lines.push(line);line=c}else line+=c}if(line)lines.push(line);return lines}
/* Full-bleed identity print. No portraits or invented profile content. */
function poster(format='4:5'){
 const d=window.TraderDNAShareCard?.data?.();if(!d)throw Error('Result not ready');
 const c=document.createElement('canvas'),W=1080,H=format==='9:16'?1920:1350;
 c.width=W;c.height=H;const ctx=c.getContext('2d');
 const ink='#171715',paper='#ece7dc',accent=d.accent||'#c6d887';
 const tall=H>1500,pad=76,contentW=W-pad*2;
 const text=(str,x,y,font,color=ink)=>{ctx.font=font;ctx.fillStyle=color;ctx.fillText(str,x,y)};
 const rule=(x,y,w,color='#3434303a')=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,1)};
 // Warm cotton surface with actual fine pixel texture, not a blurry scaled JPEG.
 let g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#f5f1e8');g.addColorStop(.55,paper);g.addColorStop(1,'#dbd5c8');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 let seed=Array.from(d.code).reduce((a,b)=>a+b.charCodeAt(0),193),rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const grain=ctx.createImageData(W,H);for(let i=0;i<grain.data.length;i+=4){const v=rand()>.5?255:35;grain.data[i]=grain.data[i+1]=grain.data[i+2]=v;grain.data[i+3]=Math.floor(rand()*7)}const gc=document.createElement('canvas');gc.width=W;gc.height=H;gc.getContext('2d').putImageData(grain,0,0);ctx.drawImage(gc,0,0);
 text('82TRADE',pad,78,'800 27px Arial');ctx.textAlign='right';text('TRADER DNA / IDENTITY EDITION',W-pad,76,'13px monospace','#66645b');ctx.textAlign='left';rule(pad,110,contentW);
 // Two-line editorial identity: code and local archetype are the first read.
 text('YOUR TRADER DNA',pad,tall?177:169,'14px monospace','#6b675c');
 let codeSize=263;ctx.font=`900 ${codeSize}px Arial`;while(ctx.measureText(d.code).width>contentW&&codeSize>170){codeSize--;ctx.font=`900 ${codeSize}px Arial`}
 const codeY=tall?442:416;text(d.code,pad-8,codeY,`900 ${codeSize}px Arial`);
 let nameSize=66;ctx.font=`700 ${nameSize}px "Songti TC","Noto Serif CJK TC",serif`;while(ctx.measureText(d.name).width>contentW&&nameSize>40){nameSize--;ctx.font=`700 ${nameSize}px "Songti TC","Noto Serif CJK TC",serif`}
 text(d.name,pad,codeY+96,`700 ${nameSize}px "Songti TC","Noto Serif CJK TC",serif`);
 ctx.fillStyle=accent;ctx.fillRect(pad,codeY+137,98,5);
 ctx.font='34px "PingFang TC","Noto Sans CJK TC",sans-serif';const hookLines=wrap(ctx,d.hook,contentW-24);const hookY=codeY+199;hookLines.forEach((s,i)=>text(s,pad,hookY+i*53,'34px "PingFang TC","Noto Sans CJK TC",sans-serif','#555249'));
 // An engraved, non-financial relief derived from the actual 18 choices.
 const reliefTop=Math.max(hookY+hookLines.length*53+20,tall?840:735);
 const reliefBottom=H-(tall?340:212);const reliefH=reliefBottom-reliefTop;
 ctx.save();ctx.beginPath();ctx.rect(0,reliefTop-35,W,reliefH+80);ctx.clip();
 const choices=(d.choices||[]);const vals=Array.from({length:18},(_,i)=>choices[i]==='A'?1:-1);
 const relief=(t,band)=>{
   const i=Math.min(16,Math.floor(t*17)),f=t*17-i,s=f*f*(3-2*f),v=vals[i]*(1-s)+vals[i+1]*s;
   const mound=Math.pow(Math.sin(Math.PI*t),1.2);
   return reliefTop+reliefH*.51+band*8.2-Math.sin(t*Math.PI*2.3+.7)*reliefH*.18*mound-v*reliefH*.07*mound+Math.cos(t*7+band*.035)*10;
 };
 for(let b=-17;b<=17;b++){
   ctx.beginPath();for(let k=0;k<=210;k++){const t=k/210,x=-90+t*(W+180),y=relief(t,b);k?ctx.lineTo(x,y):ctx.moveTo(x,y)}
   const shade=ctx.createLinearGradient(0,reliefTop,W,reliefBottom);shade.addColorStop(0,'#b2ac9d');shade.addColorStop(.25,'#686458');shade.addColorStop(.48,'#efeadf');shade.addColorStop(.65,'#8c887b');shade.addColorStop(1,'#c9c2b1');ctx.strokeStyle=shade;ctx.lineWidth=3.8;ctx.stroke();
   ctx.save();ctx.translate(0,-2.2);ctx.strokeStyle='rgba(255,255,255,.64)';ctx.lineWidth=1.15;ctx.stroke();ctx.restore();
 }
 ctx.restore();
 // Tiny archive identifier belongs to the edge, not a dashboard strip.
 const sigY=H-(tall?235:137);text('01 / DECISION RELIEF',pad,sigY,'12px monospace','#666156');ctx.textAlign='right';text('18 CHOICES / YOUR PATTERN',W-pad,sigY,'12px monospace','#666156');ctx.textAlign='left';rule(pad,sigY+22,contentW);
 const sides=(d.snapshot?.pronounced||[]).slice(0,3).map(x=>x.side);text(sides.join('  /  '),pad,sigY+66,'22px "PingFang TC","Noto Sans CJK TC",sans-serif','#393830');
 if(tall){text('SAME MARKETS.',pad,H-86,'800 23px Arial');text('A DIFFERENT YOU.',pad,H-53,'800 23px Arial')}
 ctx.textAlign='right';text('82 / '+d.code,W-pad,H-49,'15px monospace','#555248');ctx.textAlign='left';
 ctx.fillStyle=accent;ctx.fillRect(0,0,7,H);c.dataset.artifact='material-02';
 return c;
}

async function build(format='4:5'){const studio=root.querySelector('.v3-share-studio');if(!studio)return null;await document.fonts.ready;const id=++buildId,canvas=poster(format),blob=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error('PNG encode failed')),'image/png'));if(id!==buildId)return null;if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(blob);studio.dataset.format=format;studio._shareBlob=blob;studio._shareFormat=format;studio.dataset.cinemaExport='ready';studio.querySelectorAll('[data-share-format]').forEach(b=>b.classList.toggle('is-active',b.dataset.shareFormat===format));const stage=studio.querySelector('.v3-share-stage'),im=stage.querySelector('img');im.src=exportURL;im.alt=`Trader DNA ${window.TraderDNAShareCard.data().code} / ${format}`;stage.classList.add('is-ready');stage.removeAttribute('aria-busy');return {blob,url:exportURL,canvas}}
async function share(){const studio=root.querySelector('.v3-share-studio');if(!studio?._shareBlob)await build();if(!studio?._shareBlob)return;const d=window.TraderDNAShareCard.data(),file=new File([studio._shareBlob],`82TRADE-${d.code}-${studio._shareFormat.replace(':','x')}.png`,{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:d.code+' / '+d.name});return}catch(err){if(err.name==='AbortError')return}}const a=document.createElement('a');a.href=exportURL;a.download=file.name;a.click()}

function mountShareCover(studio){const d=window.TraderDNAShareCard?.data?.();if(!d||studio.querySelector('.cinema-share-cover'))return;const mark=document.createElement('div');mark.className='cinema-share-cover';const pts=d.choices.map((a,i)=>[i*25,30+(a==='A'?-1:1)*(7+(i%3)*3)]);mark.innerHTML=`<small>82TRADE / TRADER DNA</small><b>${e(d.code)}</b><strong>${e(d.name)}</strong><p>${e(d.hook)}</p><svg viewBox="-5 0 435 65" aria-label="18 decision fingerprint"><path d="M${pts.map(p=>p.join(',')).join(' L')}" fill="none" stroke="currentColor" stroke-width="1.2"/>${pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2" fill="currentColor"/>`).join('')}</svg><footer><span>18 DECISIONS / SEALED</span><span>PUBLIC IDENTITY</span></footer>`;studio.querySelector('.v3-share-stage').appendChild(mark);if(navigator.share){const button=document.createElement('button');button.type='button';button.className='cinema-system-share';button.textContent='\u7cfb\u7d71\u5206\u4eab \u2197';button.addEventListener('click',()=>share().catch(console.error));studio.querySelector('.v3-share-tools').appendChild(button)}}
async function downloadPNG(){const studio=root.querySelector('.v3-share-studio');if(!studio?._shareBlob||!exportURL)await build(studio?.dataset.format||'4:5');if(!studio?._shareBlob||!exportURL)throw Error('Export unavailable');const d=window.TraderDNAShareCard.data();const a=document.createElement('a');a.href=exportURL;a.download=`82TRADE-${d.code}-${studio._shareFormat.replace(':','x')}.png`;a.style.display='none';document.body.appendChild(a);a.click();a.remove();studio.dataset.cinemaSaved='1'}

function installShare(){const api=window.TraderDNAShareCard;if(api?.data)window.TraderDNAShareCard={...api,render:poster,build,share}}
window.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-share-format],.v3-share-generate,.v3-share-native');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();installShare();const s=root.querySelector('.v3-share-studio'),format=s?.dataset.format||'4:5';if(b.matches('[data-share-format]'))build(b.dataset.shareFormat).catch(console.error);else if(b.matches('.v3-share-native'))downloadPNG().catch(console.error);else window.TraderDNAPublish?.start(format)},true);
addEventListener('beforeunload',()=>{if(exportURL)URL.revokeObjectURL(exportURL)});window.CinemaEdition={revision:'material-02',poster,refresh:queue};
})();
