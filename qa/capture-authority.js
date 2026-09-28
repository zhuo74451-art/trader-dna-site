async page=>{
  const url='http://127.0.0.1:4173/scan01-authority-preview.html';
  const key='82trade-trader-dna:quick18-v1.2-2026-09-25';
  const codes=['IWGF','IWGC','IWHF','IWHC','IAGF','IAGC','IAHF','IAHC','SWGF','SWGC','SWHF','SWHC','SAGF','SAGC','SAHF','SAHC'];
  const answersFor=code=>{
    const answers={};for(let i=1;i<=18;i++)answers[i]='A';
    [5,10,15].forEach(id=>answers[id]=code[0]==='S'?'B':'A');
    [answers[3],answers[4],answers[14]]=code[1]==='A'?['B','A','B']:['A','B','A'];
    [answers[1],answers[7],answers[16]]=code[2]==='H'?['B','A','B']:['A','B','A'];
    [answers[6],answers[9],answers[17]]=code[3]==='C'?['B','A','A']:['A','B','B'];
    return answers;
  };
  const load=async code=>{
    await page.evaluate(({key,code,answers})=>localStorage.setItem(key,JSON.stringify({mode:'quick',index:17,answers,startedAt:'2026-09-28T00:00:00.000Z',sessionId:'qa-'+code.toLowerCase(),completed:true,completedRecord:null})),{key,code,answers:answersFor(code)});
    await page.reload({waitUntil:'networkidle'});
    await page.locator('.result-hero .scan01-authority-character[data-ready]').waitFor({state:'visible'});
  };
  await page.goto(url,{waitUntil:'networkidle'});
  for(const [mode,width,height] of [['desktop',1440,900],['mobile',390,844]]){
    await page.setViewportSize({width,height});
    for(const code of codes){await load(code);await page.locator('.result-hero').screenshot({path:`qa/after/${code}-${mode}.png`})}
  }
  await page.setViewportSize({width:1440,height:900});await load('SWGC');
  const studio=page.locator('.v3-share-studio'),stage=page.locator('.v3-share-stage');
  await studio.scrollIntoViewIfNeeded();await page.waitForTimeout(300);await studio.screenshot({path:'qa/share-3d-center.png'});
  const box=await stage.boundingBox();
  for(const [name,x,y] of [['top-left',.15,.15],['bottom-right',.85,.85]]){await page.mouse.move(box.x+box.width*x,box.y+box.height*y);await page.waitForTimeout(180);await studio.screenshot({path:`qa/share-3d-${name}.png`})}
  await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'networkidle'});await studio.scrollIntoViewIfNeeded();await studio.screenshot({path:'qa/share-mobile-390.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});await studio.scrollIntoViewIfNeeded();await studio.screenshot({path:'qa/share-reduced-motion.png'});await page.emulateMedia({reducedMotion:null});
  const mobile=[];
  for(const [width,height] of [[360,800],[390,844],[430,932]]){await page.setViewportSize({width,height});await page.reload({waitUntil:'networkidle'});mobile.push(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,ctaHeight:document.querySelector('.scan01-authority-native')?.getBoundingClientRect().height})))}
  return {heroes:codes.length,mobile};
}
