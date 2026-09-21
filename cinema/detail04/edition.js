/* Detail 04 presentation helpers. Read canonical state; never write answers or scores. */
let d4SvgId=0,d4LastQuestion=0,d4Keyboard=false,d4Flight=null,d4SawReveal=false;
const d4Reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function d4State(){try{return typeof state==='object'?state:JSON.parse(localStorage.getItem('82trade-trader-dna:standard-v1-2026-09'))}catch{return null}}
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
 if(d4Keyboard){question.focus({preventScroll:true});d4Keyboard=false}
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
