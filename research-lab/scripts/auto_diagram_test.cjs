const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  const requests=[];page.on('request',r=>requests.push(r.url()));
  const answer='සරාග සිත සරාග සිතක් ලෙස දැනගත යුතුය. [S1]\nවීතරාග සිත වීතරාග සිතක් ලෙස දැනගත යුතුය. [S1]\nසිතෙහි වෙනස්වීම පිළිබඳ සිහිය පවත්වාගත යුතුය. [S1]';
  await page.route('**/api/ask',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({label:'Test',answer,grounding:{generated:true},sources:[{id:'mn10',title:'සතිපට්ඨාන සූත්‍රය',primary:'https://suttacentral.net/mn10'}]})}));
  await page.goto('http://127.0.0.1:8765/');await page.fill('#q','සිතේ ස්වභාවය');await page.click('#go');await page.locator('.poster-create').click();
  const diagram=page.locator('.auto-dhamma-diagram');
  assert.equal(await diagram.locator('textarea').count(),2);
  await diagram.locator('summary').click();
  await diagram.locator('svg').waitFor({timeout:12000});
  const contents=await diagram.locator('svg').textContent();
  assert(contents.includes('සරාග සිත')&&contents.includes('වීතරාග සිත')&&contents.includes('[S1]'));
  assert.equal(await diagram.locator('svg [marker-end]').count(),0);
  assert(!requests.some(x=>/mermaid|aihorde|poster-background/.test(x)));
  assert((await page.locator('.poster-guidance').textContent()).includes('නිදසුන් පමණි'));
  assert(!/CPU|GPU/.test(await page.locator('.poster-editor').textContent()));
  await diagram.locator('input').fill('සංස්කරණය කළ මාතෘකාව');
  await diagram.locator('textarea').first().fill('සිත සිහියෙන් නිරීක්ෂණය කිරීම. [S1]\nසරාග සිත දැනගැනීම. [S1]');
  await diagram.locator('textarea').nth(1).fill('MN 10 — සතිපට්ඨාන සූත්‍රය');
  assert(await diagram.getByRole('button',{name:'SVG',exact:true}).isDisabled());
  await diagram.getByRole('button',{name:/සටහන යාවත්කාලීන කරන්න|Update diagram/}).click();
  await diagram.locator('svg').waitFor();
  const updated=await diagram.locator('svg').textContent();
  assert(updated.includes('සංස්කරණය කළ මාතෘකාව')&&updated.includes('සිත සිහියෙන්')&&updated.includes('MN 10'));
  const promise=page.waitForEvent('download');await diagram.getByRole('button',{name:'SVG',exact:true}).click();const svg=await promise;await svg.saveAs('/tmp/auto-dhamma-diagram.svg');
  const pngPromise=page.waitForEvent('download');await diagram.getByRole('button',{name:/Diagram PNG|සටහන PNG/}).click();const png=await pngPromise;await png.saveAs('/tmp/auto-dhamma-diagram.png');
  assert.equal(png.suggestedFilename(),'suttago-dhamma-diagram.png');
  console.log('Automatic diagram: source text, citations, automatic prefill and editable content, no external diagram API, SVG and PNG exports passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});