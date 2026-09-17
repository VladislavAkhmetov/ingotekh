const fs=require('fs');
const {chromium}=require('C:/Users/amazi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-lcd-text','--font-render-hinting=none']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 fs.mkdirSync('design-reference/rendered',{recursive:true});
 const sections=await page.locator('[id]').all();const sizes=[];
 for(const section of sections){const name=await section.getAttribute('data-name');if(!/^\d\d_/.test(name||''))continue;
  const box=await section.boundingBox();const scrollY=await page.evaluate(()=>window.scrollY);sizes.push({name,...box,y:box.y+scrollY});await section.screenshot({path:`design-reference/rendered/${name}.png`});
 }
 const broken=await page.locator('img').evaluateAll(images=>images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src')));
 console.log(JSON.stringify({sizes,broken,errors},null,2));
 await page.screenshot({path:'design-reference/rendered/full-page.png',fullPage:true});
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
