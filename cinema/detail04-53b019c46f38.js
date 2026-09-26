/* DOM presentation adapter. No changes to questions, scores or saved answers. */
(()=>{'use strict';
const root=document.querySelector('#view'),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let manifest={},queued=false,exportURL=null,buildId=0;
const text={note:'人物映射參考其公開決策風格，不代表本人參與測驗或背書。',example:'此處為人物檔案示例，並非你的測驗結果。完成選擇後，才會顯示與你同型的人物。'};
fetch('./cinema/portraits-detail04-card-0dca88dce1bb.json').then(r=>r.json()).then(m=>{manifest=m;queue()}).catch(()=>{});
const terrain=new Image();terrain.src='./cinema/assets/terrain.webp';
function types(){return typeof TYPES==='object'?TYPES:{}}
function parse(raw){const a=String(raw).split('\n'),n=(a.shift()||'').split('｜');return {name:n[0]||'',local:n[1]||'',desc:a.join(' ')}}
function header(example=false){return `<header class="archive-header"><div><span class="eyebrow">${example?'THE ARCHIVE / SELECTED STUDIES':'SAME TYPE / DIFFERENT LIVES'}</span><h2>${example?'不同的人，相似的決定。':'與誰同類'}</h2><p>${example?'有人先等到對的位置，有人先走進未知。你的選擇，也有自己的紋路。':'不同的人生，相似的決策習慣。這是風格映射，不是績效預測。'}</p></div><div class="archive-side">DIFFERENT PATHS.<br>SIMILAR DECISIONS.<br><br>82TRADE / ARCHIVE</div></header>`}
function rawCard(p,i){return `<article class="person" data-refined="1"><figure class="v3-person-portrait" data-person="${e(p.name)}"><div class="v3-person-index">${String(i+1).padStart(2,'0')}</div><div class="v3-person-fallback"><span>TRADER ARCHIVE</span><b>${e(p.name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</b><small>PORTRAIT STUDY</small></div><img alt="${e(p.name)}" loading="lazy"><figcaption class="v3-person-source"></figcaption></figure><div class="v3-person-copy"><div class="v3-person-name">${e(p.name)}<small>${e(p.local)}</small></div><div class="v3-person-desc">${e(p.desc)}</div></div></article>`}
function personData(person){const n=person.querySelector('.v3-person-name');return {name:n?.childNodes[0]?.textContent.trim()||'',local:n?.querySelector('small')?.textContent||'',desc:person.querySelector('.v3-person-desc')?.textContent||''}}
function showModal(html,label){let d=document.querySelector('.cinema-dialog');if(!d){d=document.createElement('dialog');d.className='cinema-dialog';d.innerHTML='<button class="dialog-close" type="button" aria-label="關閉">×</button><div class="dialog-body"></div>';document.body.appendChild(d);d.querySelector('button').onclick=()=>d.close();d.onclick=event=>{if(event.target===d)d.close()}}d.setAttribute('aria-label',label);d.querySelector('.dialog-body').innerHTML=html;d.showModal()}
function about(){showModal('<span class="eyebrow">ABOUT THE ASSESSMENT</span><h2>不是標籤。<br>是看見自己的方式。</h2><p>Trader DNA 是一次關於決策習慣的自我探索。先回答 18 個選擇，看見第一層輪廓；也可以繼續完整 54 題。</p><p>請選更像真實自己的那一邊，不用找標準答案。這不是心理診斷或投資建議，也不測量報酬能力、風險承受能力。</p><small>你的答題進度保存在這台裝置的瀏覽器。分享卡不包含私人提醒；清除瀏覽器資料會刪除本機進度。</small>','關於測驗')}
function hydrate(person){
 const f=person.querySelector('.v3-person-portrait'),im=f?.querySelector('img');if(!im)return;
 const name=f.dataset.person||personData(person).name,m=manifest[name];if(m?.kind!=='image')return;
 person.classList.remove('is-portrait-deferred');f.dataset.medium=m.medium||'photograph';f.style.setProperty('--portrait-position',m.objectPosition||'50% 20%');
 const src=new URL(m.cardUrl||m.url,location.href).href;
 const failed=()=>{f.classList.add('is-fallback');f.classList.remove('has-image');const fb=f.querySelector('.v3-person-fallback');if(fb&&fb.dataset.errorShown!=='1'){fb.dataset.errorShown='1';fb.innerHTML='<b>影像暫時無法載入</b><small>人物文字檔案仍可閱讀</small>'}};
 if(im.src!==src){im.onload=()=>{f.classList.add('has-image');f.classList.remove('is-fallback')};im.onerror=failed;im.alt=name;im.loading=person.closest('.examples')?'lazy':'eager';im.decoding='async';im.src=src}
 if(im.complete){if(im.naturalWidth){f.classList.add('has-image');f.classList.remove('is-fallback')}else failed()}
 const credit=f.querySelector('figcaption');if(credit&&credit.dataset.detail!==src){credit.dataset.detail=src;const label={photograph:'攝影檔案',painting:'歷史畫像',sculpture:'雕塑影像',illustration:'資料插圖'}[m.medium]||'影像檔案';credit.innerHTML=`${e(label)}<br><a href="${e(m.sourceUrl||'#')}" target="_blank" rel="noopener noreferrer" aria-label="${e(name)} 影像出處">${e(m.credit||m.source||'來源檔案')} ↗</a>`}
}
function enrich(person){const copy=person.querySelector('.v3-person-copy');if(!copy)return;hydrate(person);if(copy.dataset.cinema)return;copy.dataset.cinema='1';const p=personData(person),idx=[...person.parentElement.children].indexOf(person)+1,ex=person.closest('.examples');copy.insertAdjacentHTML('afterbegin',`<div class="person-label">TRADER ARCHIVE<br>${String(idx).padStart(3,'0')} / ${ex?'SELECTED STUDY':'STYLE MAPPING'}</div>`);copy.insertAdjacentHTML('beforeend',`<div class="person-categories">${ex?'DECISION / IDENTITY / PATTERN':'SAME PATTERN / DIFFERENT PATH'}</div><button class="person-read" type="button" aria-label="閱讀 ${e(p.name)} 人物檔案">VIEW DOSSIER <span>↗</span></button>`);copy.querySelector('button').onclick=()=>{const m=manifest[p.name],src=m?.url?new URL(m.url,location.href).href:person.querySelector('img')?.src,photo=person.querySelector('.has-image:not(.is-fallback)');showModal(`${photo&&src?`<img src="${e(src)}" alt="${e(p.name)}">`:''}<span class="eyebrow">ARCHIVE / DECISION STYLE</span><h2>${e(p.name)}</h2><h3>${e(p.local)}</h3><p>${e(p.desc)}</p><small>${text.note}${m?.credit?'<br>IMAGE / '+e(m.credit):''}${m?.license?' / '+e(m.license):''}${m?.sourceUrl?`<br><a href="${e(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">影像來源與授權 ↗</a>`:''}</small>`,p.name)}}
function landing(){const hero=root.querySelector('.hero');if(!hero)return;const obj=hero.querySelector('.v3-hero-material');if(obj&&!obj.querySelector('.cinema-face'))obj.insertAdjacentHTML('beforeend','<div class="cinema-face"><img src="./cinema/assets/scan-study.webp" alt="" fetchpriority="high"></div><div class="cinema-scan-copy"><strong>IDENTITY<br>UNDER PRESSURE.</strong>NOT WHAT YOU SAY.<br>WHAT YOU REPEAT.</div><div class="cinema-scan-side">SAME<br>MARKETS.<br>A DIFFERENT<br>YOU.</div><i class="cinema-cross"></i>');if(!root.querySelector('.examples')&&Object.keys(types()).length){const people=Object.values(types()).flatMap(t=>t.people).map(parse);const selected=['Howard Marks','Paul Tudor Jones','Warren Buffett'].map(n=>people.find(p=>p.name===n)).filter(Boolean);const sec=document.createElement('section');sec.className='cinema-archive examples';sec.id='cinema-archive-examples';sec.innerHTML=header(true)+`<div class="people">${selected.map(rawCard).join('')}</div><div class="archive-note">${text.example}</div>`;hero.insertAdjacentElement('afterend',sec)}}
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

 const publish=root.querySelector('.v3-share-generate');if(publish){const done=root.querySelector('.v3-share-studio')?.dataset.v48Publish==='published';const value=done?'\u5206\u4eab\u6d77\u5831\u5df2\u751f\u6210':'\u5c55\u958b\u5206\u4eab\u6d77\u5831';if(publish.dataset.materialText!==value){publish.dataset.materialText=value;publish.innerHTML=value+' <span>'+ (done?'\u2713':'\u2192')+'</span>'}}
}

/* Detail 04 presentation helpers. Read canonical state; never write answers or scores. */
let d4SvgId=0,d4LastQuestion=0,d4Keyboard=false,d4Flight=null,d4SawReveal=false;
const d4Reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function d4State(){try{return typeof state==='object'?state:JSON.parse(localStorage.getItem('82trade-trader-dna:quick18-v1.2-2026-09-25'))}catch{return null}}
function d4Choices(block=0){const answers=d4State()?.answers||{};return Array.from({length:18},(_,i)=>answers[block*18+i+1]||null)}
function d4Imprint(choices,extra=''){
 const id='d4-grain-'+(++d4SvgId),n=choices.filter(Boolean).length;let history=0;
 const values=choices.map((v,i)=>{history=history*.72+(v==='A'?-1:v==='B'?1:0);return history/3.2}),phase=values.reduce((s,v,i)=>s+v*(i+1),0)*.035;
 const bands=Array.from({length:25},(_,i)=>i-12).map(b=>{let d='';for(let k=0;k<=80;k++){const t=k/80,u=t*17,j=Math.min(16,Math.floor(u)),f=u-j,a=f*f*(3-2*f),v=values[j]*(1-a)+values[j+1]*a,envelope=Math.pow(Math.sin(Math.PI*t),1.4),y=90+b*3.1+envelope*(Math.sin(t*6.5+phase+b*.021)*26+Math.cos(t*11.2+b*.05)*12+v*15)*(n?.8+n/50:.32),x=16+t*568;d+=(k?' L':'M')+x.toFixed(2)+' '+y.toFixed(2)}return `<path class="imprint-ink" pathLength="1" d="${d}" stroke="url(#${id})"/><path class="imprint-edge" pathLength="1" d="${d}" transform="translate(0,-1.05)"/>`}).join('');
 return `<svg class="d4-imprint ${extra}" data-decisions="${n}" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2=".6" gradientUnits="objectBoundingBox"><stop stop-color="#b2ae9b"/><stop offset=".23" stop-color="#676f50"/><stop offset=".5" stop-color="#babaa2"/><stop offset=".7" stop-color="#7b8066"/><stop offset="1" stop-color="#c4c5af"/></linearGradient></defs>${bands}</svg>`;
}
function d4PhaseRail(phase,local,answered){
 const labels=['開始選擇','繼續探索','輪廓將成'],en=['OBSERVE','EXPLORE','RESOLVE'];
 return labels.map((name,i)=>{const done=Math.max(0,Math.min(6,answered-i*6)),fill=done===6?1:done/6,points=Array.from({length:6},(_,j)=>{const index=i*6+j,x=8+304*j/5,current=index===local,cls=index<answered?'is-done':current?'is-now':'';return `${current?`<circle class="d4-rail-halo" cx="${x}" cy="12" r="3"/>`:''}<circle class="d4-rail-point ${cls}" cx="${x}" cy="12" r="${current?3.2:2.1}"/>`}).join(''),ticks=Array.from({length:11},(_,j)=>`<path class="d4-rail-tick" d="M${8+304*j/10} 18v3"/>`).join('');return `<li class="${i===phase?'is-current':i<phase?'is-complete':''}" ${i===phase?'aria-current="step"':''}><div class="d4-phase-heading"><span class="d4-phase-index">0${i+1}</span><b>${name}</b><small>${en[i]}</small></div><svg class="d4-phase-track" viewBox="0 0 320 24" preserveAspectRatio="none" aria-hidden="true"><path class="d4-rail-base" d="M8 12H312"/><path class="d4-rail-fill" pathLength="1" stroke-dasharray="${fill} 1" d="M8 12H312"/>${ticks}${points}</svg></li>`}).join('');
}
function quizDetail(){
 const w=root.querySelector('.quiz-wrap');if(!w)return;
 const qNum=Number(w.querySelector('.question-index')?.textContent.replace(/\D/g,''))||1,s=d4State(),total=s?.mode==='full'?54:18,block=Math.floor((qNum-1)/18),local=(qNum-1)%18,phase=Math.floor(local/6),chosen=d4Choices(block),answered=chosen.filter(Boolean).length,sig=qNum+':'+chosen.join('-');
 if(w.dataset.detailSig===sig)return;w.dataset.detailSig=sig;w.dataset.chapter=String(phase+1);w.classList.add('detail-quiz');
 if(d4LastQuestion!==qNum){d4LastQuestion=qNum;requestAnimationFrame(()=>{if(w.isConnected)scrollTo({top:0,behavior:'instant'})})}
 let steps=w.querySelector('.detail-chapters');if(!steps){steps=document.createElement('ol');steps.className='detail-chapters';w.querySelector('.meta').after(steps)}steps.setAttribute('aria-label',`本組已記錄 ${answered} / 18 個選擇`);steps.innerHTML=d4PhaseRail(phase,local,answered);
 let panel=w.querySelector('.detail-register');if(!panel){panel=document.createElement('aside');panel.className='detail-register';panel.setAttribute('aria-label','你的選擇記錄');w.appendChild(panel)}
 const cells=chosen.map((v,i)=>`<li class="${v?'is-recorded':''} ${i===local?'is-current':''}" data-slot="${i}" aria-label="第 ${i+1} 題${v?'，已選 '+v:'，尚未作答'}"><small>${String(i+1).padStart(2,'0')}</small><b>${v||'·'}</b></li>`).join('');
 panel.innerHTML=`<div class="register-top"><span>YOUR DECISIONS</span><b>0${block+1} / SCAN</b></div><div class="register-title"><h3>每一次選擇，<br>都留下痕跡。</h3><span class="register-completed"><b>${String(answered).padStart(2,'0')}</b><small>/ 18 已記錄</small></span></div><ol class="decision-cells" aria-label="本組選擇記錄">${cells}</ol><div class="register-trace"><div class="d4-trace-label"><span>DECISION IMPRINT</span><span>${answered?'FORMING':'UNISSUED'}</span></div>${d4Imprint(chosen)}</div><div class="register-footer"><span>沒有標準答案</span><span>只有你的選擇</span></div>`;
 let hint=w.querySelector('.detail-question-note');if(!hint){hint=document.createElement('p');hint.className='detail-question-note';hint.textContent='選更像真實自己的那一邊。';w.querySelector('.question').after(hint)}
 const question=w.querySelector('.question'),options=w.querySelector('.options');question.id='decision-question';question.tabIndex=-1;options.setAttribute('aria-labelledby',question.id);options.setAttribute('role','group');w.querySelector('.count').setAttribute('aria-label',`第 ${qNum} 題，共 ${total} 題`);w.querySelectorAll('.option .letter').forEach(el=>el.dataset.caption='CHOICE / '+(el.textContent.trim()==='A'?'01':'02'));
 if(local===6||local===12)w.classList.add('chapter-arrival');
 if(d4Keyboard&&w.dataset.responding!=='1'){question.focus({preventScroll:true});d4Keyboard=false}
}
// Only respond to the website's own answer buttons. No global keyboard listeners.
root.addEventListener('click',function recordVisualChoice(event){
 const option=event.target.closest('.option');if(!option||option.disabled)return;
 const wrap=option.closest('.quiz-wrap');if(!wrap)return;d4Keyboard=event.detail===0;wrap.dataset.responding='1';
 const panel=wrap.querySelector('.detail-register');const box=panel?.getBoundingClientRect();
 if(box)d4Flight={x:box.x+box.width/2,y:box.y+box.height/2,when:performance.now()};
 const slot=wrap.querySelector('.decision-cells .is-current');if(slot){slot.classList.add('is-recorded','just-recorded');slot.querySelector('b').textContent=option.dataset.choice}
 if(panel)panel.dataset.pressed='1';option.querySelector('.arrow').textContent='✓';
 requestAnimationFrame(()=>{if(!wrap.isConnected)return;const caption=wrap.querySelector('.captured');if(caption)caption.textContent='已記錄，下一個選擇。';queue()});
},{capture:true});
// Animate the existing result text on a visible paper surface.
function d4Reveal(){
 const reveal=root.querySelector('.reveal');
 if(!reveal||reveal.dataset.d4Ready)return;
 reveal.dataset.d4Ready='1';reveal.classList.add('d4-reveal');d4SawReveal=true;
 const material=document.createElement('div');material.className='d4-reveal-material';
 const lock=reveal.querySelector('.reveal-lock');if(lock)material.appendChild(lock);
 material.insertAdjacentHTML('beforeend',d4Imprint(d4Choices(),'d4-reveal-imprint'));
 reveal.appendChild(material);
 const caption=document.createElement('div');caption.className='d4-reveal-caption';
 caption.textContent='每一次選擇，都成為你的身份。';reveal.appendChild(caption);
 d4DrawConvergence(reveal);
 scrollTo({top:0,behavior:'instant'});
}
function d4DrawConvergence(reveal){
 const top=document.querySelector('.topbar').offsetHeight,width=innerWidth,height=Math.max(innerHeight-top,500);
 const origin=d4Flight||{x:width*.78,y:height*.4};
 const sx=Math.max(20,Math.min(width-20,origin.x)),sy=Math.max(20,Math.min(height-20,origin.y-top));
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('class','d4-convergence');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
 svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
 for(let i=0;i<18;i++){
  const angle=(i-8.5)*3.8,x=sx+Math.sin(i*.65)*10,y=sy+angle*.45;
  const ex=width*.5+(i-8.5)*Math.min(11,width/52),ey=height*.5+38+(i%2?-1:1)*(9+i%4*3);
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('pathLength','1');path.style.animationDelay=i*9+'ms';
  path.setAttribute('d',`M${x} ${y} C${x+(width*.5-sx)*.65} ${y-70+angle},${ex+(sx>width*.5?90:-90)} ${ey-105+angle},${ex} ${ey}`);
  svg.appendChild(path);
 }
 reveal.appendChild(svg);
}
function d4Navigation(){
 const bar=document.querySelector('.topbar');if(!bar||bar.querySelector('.d4-mobile-menu'))return;
 const nav=bar.querySelector('.cinema-nav');nav.id='d4-navigation';
 const button=document.createElement('button');button.className='d4-mobile-menu';button.type='button';button.textContent='選單 +';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',nav.id);nav.after(button);
 const close=()=>{bar.dataset.menuOpen='false';button.setAttribute('aria-expanded','false');button.textContent='選單 +'};
 button.onclick=()=>{const open=bar.dataset.menuOpen!=='true';bar.dataset.menuOpen=String(open);button.setAttribute('aria-expanded',String(open));button.textContent=open?'關閉 −':'選單 +'};
 nav.addEventListener('click',close);root.addEventListener('click',close);
}
let d4WarmPortraitCode='';
function d4WarmSameTypePortraits(){
 const code=(root.querySelector('.reveal-code')||root.querySelector('.result .code'))?.textContent.trim();
 if(!code||code===d4WarmPortraitCode||!Object.keys(manifest).length)return;
 const people=types()?.[code]?.people;if(!Array.isArray(people)||!people.length)return;
 d4WarmPortraitCode=code;
 people.map(parse).forEach((person,index)=>{const m=manifest[person.name];if(m?.kind!=='image')return;const img=new Image();img.decoding='async';img.fetchPriority=index<2?'high':'auto';img.src=new URL(m.cardUrl||m.url,location.href).href;});
}
function detailSurfaces(){
 d4Navigation();d4Reveal();d4WarmSameTypePortraits();
 // A legacy share renderer can finish after this edition. Keep the preview and download on the same exported artifact.
 const shareStudio=root.querySelector('.v3-share-studio'),shareImage=shareStudio?.querySelector('.v3-share-stage>img');
 if(shareStudio?.dataset.cinemaExport==='ready'&&exportURL&&shareImage&&shareImage.src!==exportURL)shareImage.src=exportURL;
 const result=root.querySelector('.result');
 if(result&&result.querySelector('.v47-identity-stack')&&!result.dataset.d4Ready){
  result.dataset.d4Ready='1';if(d4SawReveal&&!d4Reduced())result.classList.add('d4-result-enter');d4SawReveal=false;
 }
 const plate=root.querySelector('.v4-result-mark');
 if(plate&&!plate.querySelector('.d4-plate-imprint'))plate.insertAdjacentHTML('beforeend',d4Imprint(d4Choices(),'d4-plate-imprint'));
 const cover=root.querySelector('.cinema-share-cover');
 if(cover&&!cover.querySelector('.d4-cover-imprint'))cover.querySelector('svg')?.insertAdjacentHTML('afterend',d4Imprint(d4Choices(),'d4-cover-imprint'));
 const specimen=root.querySelector('.v4-landing-specimen');
 if(specimen&&!specimen.querySelector('.d4-imprint'))specimen.insertAdjacentHTML('beforeend',d4Imprint(Array(18).fill(null)));
 root.querySelectorAll('.person').forEach(card=>{
  const name=card.querySelector('.v3-person-portrait')?.dataset.person||'';
  if(name.split(' ').some(word=>word.length>10))card.dataset.longName='1';
 });
}
window.Detail04={revision:'detail-04',imprint:d4Imprint};

function sync(){queued=false;landing();result();quizDetail();root.querySelectorAll('.person').forEach(enrich);materialSync();detailSurfaces();document.body.dataset.scene=root.querySelector('.result')?'result':root.querySelector('.quiz-wrap')?'question':root.querySelector('.reveal')?'reveal':'landing'}
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
addEventListener('beforeunload',()=>{if(exportURL)URL.revokeObjectURL(exportURL)});window.CinemaEdition={revision:'detail-04',poster,refresh:queue};
})();
