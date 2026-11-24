const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/api/ask',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({label:'Test',answer:'සිත පිළිබඳව සිහියෙන් නිරීක්ෂණය කළ යුතුය. [S1]',sources:[{id:'mn10',title:'සතිපට්ඨාන සූත්‍රය',primary:'https://suttacentral.net/mn10'}]})}));
  await page.goto('http://127.0.0.1:8765/');
  await page.fill('#q','සිතේ ස්වභාවය');await page.click('#go');await page.locator('.poster-create').click();
  const d=page.locator('.poster-editor details').filter({hasText:'Mermaid'});
  await d.locator('summary').click();
  await d.locator('textarea').fill('අවිද්‍යාව\nසංස්කාර\nවිඤ්ඤාණය');
  await d.locator('button').first().click();
  await d.locator('svg').waitFor({timeout:45000});
  assert((await d.locator('svg').textContent()).includes('අවිද්‍යාව'));
  assert(await d.getByRole('button',{name:'SVG',exact:true}).isEnabled());
  console.log('Mermaid browser rendered Sinhala labels and SVG export enabled');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});