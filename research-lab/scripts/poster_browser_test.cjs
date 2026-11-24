const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/ask',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({label:'Test',answer:'සිතෙහි රාගය තිබේ නම් රාග සහිත සිතක් ලෙස දැනගත යුතුය. සිතෙහි වෙනස්වීම සිහියෙන් නිරීක්ෂණය කළ යුතුය. [S1]',sources:[{id:'mn10',title:'සතිපට්ඨාන සූත්‍රය',primary:'https://suttacentral.net/mn10'}]})}));
  await page.goto('http://127.0.0.1:8765/');
  await page.fill('#q','සිතේ ස්වභාවය');
  await page.click('#go');
  await page.locator('.poster-create').click();
  const editor=page.locator('.poster-editor');
  await editor.getByRole('button',{name:'PNG',exact:true}).waitFor();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.poster-editor button')).some(b=>b.textContent==='PNG'&&!b.disabled),{},{timeout:15000});
  assert.equal(await editor.locator('canvas').evaluate(c=>c.width),1080);
  assert.equal(await editor.locator('canvas').evaluate(c=>c.height),1350);
  const dl=page.waitForEvent('download');await editor.getByRole('button',{name:'PNG',exact:true}).click();const d=await dl;await d.saveAs('/tmp/poster-demo.png');
  assert.equal(errors.length,0,errors.join(';'));
  console.log('Browser poster preview and 1080×1350 PNG export passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
