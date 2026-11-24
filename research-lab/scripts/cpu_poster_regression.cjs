const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage({viewport:{width:390,height:844}});
const gpu=[];page.on('request',r=>{if(/aihorde|kaggle/i.test(r.url()))gpu.push(r.url())});
await page.route('**/api/ask',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({label:'Test',answer:'සිතෙහි ස්වභාවය සිහියෙන් නිරීක්ෂණය කළ යුතුය. [S1]',sources:[{id:'mn10',title:'සතිපට්ඨාන සූත්‍රය',primary:'https://suttacentral.net/mn10'}]})}));
await page.route('**/api/poster-background',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"cpu_unavailable"}'}));
await page.goto('http://127.0.0.1:8765/');await page.fill('#q','සිතේ ස්වභාවය');await page.click('#go');await page.locator('.poster-create').click();
const editor=page.locator('.poster-editor');const prompt=editor.locator('textarea[maxlength="350"]');
const make=editor.getByRole('button',{name:/අලුත් පසුබිමක් සාදන්න|Create background/});
await prompt.fill('නිසල විල සහ නෙළුම් පොකුණ');await make.click();await page.waitForFunction(()=>!document.querySelector('.poster-editor button[disabled]')||Array.from(document.querySelectorAll('.poster-editor small')).some(x=>x.textContent.includes('Instant illustration')||x.textContent.includes('ක්ෂණික භූදර්ශනය')));
const first=await editor.locator('canvas').evaluate(c=>c.toDataURL());
await prompt.fill('සන්සුන් වනාන්තරය සහ දිය ඇල්ල');await make.click();await make.isEnabled();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.poster-editor button')).find(x=>/අලුත් පසුබිමක් සාදන්න|Create background/.test(x.textContent))?.disabled===false);
const second=await editor.locator('canvas').evaluate(c=>c.toDataURL());assert.notEqual(first,second);
assert.equal(gpu.length,0);assert(!/Nova Anime|AI Horde|Juggernaut/.test(await editor.textContent()));
assert(await editor.getByRole('button',{name:'PNG',exact:true}).isEnabled());console.log('CPU illustration variation, no GPU requests, PNG enabled: passed');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});