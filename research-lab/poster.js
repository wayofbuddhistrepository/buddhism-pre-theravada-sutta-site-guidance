/* Local poster compositor: no image API charge, no uploads of user text or images. */
(()=>{
const $=(root,s)=>root.querySelector(s);
const assetBase='https://raw.githubusercontent.com/wayofbuddhistrepository/buddhism-pre-theravada-sutta-site-guidance/suttago-poster-assets/';
const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700&family=Abhaya+Libre:wght@400;600;700&display=swap';document.head.append(fonts);
const styles=document.createElement('style');styles.textContent='.poster-editor{border:1px solid #d5dfd4;background:#fafaf5;border-radius:14px;padding:16px;margin-top:16px}.poster-editor label{display:block;font-size:14px;color:#49665b;margin-top:9px}.poster-editor input:not([type=file]),.poster-editor textarea,.poster-editor select{box-sizing:border-box;width:100%;font:inherit;padding:8px;border:1px solid #a9b9af;border-radius:8px;background:white;color:#183c33}.poster-editor textarea{margin:0}.poster-editor canvas{display:block;width:100%;max-height:660px;object-fit:contain;margin:12px 0;background:#eee}.poster-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.poster-editor button{font-size:15px}.poster-editor button[disabled]{opacity:.5}.poster-editor small{display:block}.poster-editor .poster-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.poster-create{margin-top:10px}';document.head.append(styles);
const add=(p,t,v)=>{const n=document.createElement(t);if(v!==undefined)n.textContent=v;p.append(n);return n};
const tidy=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/\*\*|__|^#{1,6}\s*/gm,'').replace(/\[S\d+\]/g,'').replace(/\s+/g,' ').trim();
function cropWords(s,n){const w=Array.from(s);if(w.length<=n)return s;const sub=w.slice(0,n).join('');const i=sub.lastIndexOf(' ');return (i>n*.65?sub.slice(0,i):sub)+'…'}
function sourceQuotes(d){
 const out=[];for(const [i,s] of (d.sources||[]).entries())for(const p of s.passages||[]){
  if(typeof p.text!=='string'||!p.pali||!p.locator)continue;
  const t=p.text.replace(/\s+/g,' ').trim();
  if(t.length>=20&&t.length<=240&&!out.some(x=>x.includes(t)))out.push(t+' ['+(s.citation||'S'+(i+1))+']');
 }
 return out;
}
function extract(d){
 if(d.grounding?.generated!==true)return sourceQuotes(d).slice(0,2).join('\n\n');
 const lines=String(d.answer||'').split(/\n+/).map(x=>x.replace(/^\s*[-*•]\s*/,'').trim()).filter(Boolean);
 return lines.filter(x=>tidy(x).length>40&&tidy(x).length<=250&&/\[S\d+\]/.test(x)).slice(0,2).map(x=>x.replace(/\*\*|__/g,'')).join('\n\n');
}
function load(url){return new Promise((resolve,reject)=>{let i=new Image();i.crossOrigin='anonymous';i.onload=()=>resolve(i);i.onerror=reject;i.src=url})}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function cover(ctx,img,x,y,w,h){const sc=Math.max(w/img.width,h/img.height),sw=w/sc,sh=h/sc;ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h)}
function decorative(ctx,W,H,theme){
 const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,theme==='gold'?'#f1dca4':'#d8e4d2');grad.addColorStop(.45,theme==='gold'?'#d7aa66':'#769486');grad.addColorStop(1,'#183c38');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 let sky=ctx.createRadialGradient(W*.27,H*.23,5,W*.27,H*.23,W*.65);sky.addColorStop(0,'#fff3c8');sky.addColorStop(.24,'#f8dba19c');sky.addColorStop(1,'#fff0');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 for(let j=0;j<4;j++){ctx.beginPath();ctx.moveTo(0,H*(.46+j*.09));for(let i=0;i<=8;i++)ctx.lineTo(W*i/8,H*(.42+j*.09+Math.sin(i*1.43+j)*.05));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fillStyle=['#94a895','#63877b','#406b60','#224c43'][j];ctx.fill()}
 for(let i=0;i<8;i++){let x=W*(.04+i*.135),y=H*(.87+Math.sin(i*2)*.035);ctx.save();ctx.translate(x,y);ctx.scale(W/1080,W/1080);ctx.fillStyle='#e3bca4';for(let j=0;j<5;j++){ctx.save();ctx.rotate((j-2)*.44);ctx.beginPath();ctx.ellipse(0,-19,10,28,0,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.fillStyle='#e7c276';ctx.beginPath();ctx.ellipse(0,-5,15,8,0,0,Math.PI*2);ctx.fill();ctx.restore()}
}

// CPU-only procedural fallback. This is illustration, not neural inference.
function scenic(ctx,W,H,theme,prompt,seed){
 let hash=2166136261;for(const c of prompt+' '+seed){hash=Math.imul(hash^c.codePointAt(0),16777619)}
 let state=hash>>>0;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const p=prompt.toLowerCase(),forest=/forest|woods|වනාන්තර|කැලෑ/.test(p),falls=/waterfall|දිය\s*ඇල්ල/.test(p),night=/night|moon|රාත්‍රි|සඳ/.test(p),lotuses=/lotus|නෙළුම්|පොකුණ/.test(p),lake=/lake|විල|pond|පොකුණ/.test(p);
 const sky=ctx.createLinearGradient(0,0,0,H*.65);sky.addColorStop(0,night?'#213555':'#7198b0');sky.addColorStop(.55,night?'#7c8caa':'#e7c4ad');sky.addColorStop(1,night?'#a9b9b0':'#fff0c2');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 const sx=W*(.13+rnd()*.73),sy=H*(.09+rnd()*.22);let glow=ctx.createRadialGradient(sx,sy,0,sx,sy,W*.35);glow.addColorStop(0,'#fff9db');glow.addColorStop(.2,night?'#d9e7ff77':'#fff0b4aa');glow.addColorStop(1,'#fff0');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.fillStyle=night?'#e9f0f8':'#fff4cd';ctx.beginPath();ctx.arc(sx,sy,W*.043,0,7);ctx.fill();
 for(let j=0;j<5;j++){let base=H*(.34+j*.075);ctx.fillStyle=['#a5b6ba','#849f9e','#618b81','#477464','#285d50'][j];ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,base);for(let i=0;i<=24;i++)ctx.lineTo(i*W/24,base+Math.sin(i*.63+j)*H*.055+(rnd()-.5)*H*.035);ctx.lineTo(W,H);ctx.closePath();ctx.fill()}
 const waterY=H*(.43+rnd()*.22);const water=ctx.createLinearGradient(0,waterY,0,H);water.addColorStop(0,'#91b2a4');water.addColorStop(1,'#285d63');ctx.fillStyle=water;ctx.fillRect(0,waterY,W,H-waterY);
 for(let i=0;i<220;i++){let y=waterY+rnd()*(H-waterY),x=rnd()*W;ctx.strokeStyle=i%5===0?'#f5ddac70':'#c9e5cd40';ctx.lineWidth=1+rnd()*2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+10+rnd()*W*.13,y);ctx.stroke()}
 function tree(x,y,h){let thick=h*.075;ctx.fillStyle='#254a40';ctx.beginPath();ctx.moveTo(x-thick,y);ctx.quadraticCurveTo(x+thick,y-h*.6,x-thick*.2,y-h);ctx.lineTo(x+thick*.4,y-h);ctx.quadraticCurveTo(x+thick*2,y-h*.5,x+thick,y);ctx.fill();for(let i=0;i<50;i++){let ang=rnd()*6.28,rr=Math.sqrt(rnd())*h*.32,xx=x+Math.cos(ang)*rr,yy=y-h*.8+Math.sin(ang)*rr*.65;ctx.fillStyle=['#275d48','#326d51','#4d8460','#80a96c','#b3c787'][Math.floor(rnd()*5)];ctx.beginPath();ctx.ellipse(xx,yy,h*(.06+rnd()*.095),h*(.04+rnd()*.07),rnd()*3,0,7);ctx.fill()}}
 for(let i=0;i<(forest?16:8);i++){let x=W*(rnd()<.5?rnd()*.3:.72+rnd()*.28);tree(x,H*(.52+rnd()*.14),H*(.15+rnd()*.3))}
 if(forest&&!lake&&!lotuses&&!falls){
  ctx.fillStyle='#456b49';ctx.fillRect(0,waterY,W,H-waterY);
  const pathX=W*(.18+rnd()*.65);ctx.fillStyle='#c4b694';ctx.beginPath();ctx.moveTo(pathX,waterY);ctx.bezierCurveTo(pathX-W*.08,H*.78,pathX+W*.18,H*.91,pathX+W*.25,H);ctx.lineTo(pathX-W*.24,H);ctx.bezierCurveTo(pathX-W*.02,H*.87,pathX-W*.15,H*.76,pathX,waterY);ctx.fill();
  for(let i=0;i<160;i++){const x=rnd()*W,y=waterY+rnd()*(H-waterY);ctx.fillStyle=['#73946a','#92a375','#315e47'][i%3];ctx.beginPath();ctx.ellipse(x,y,4+rnd()*14,2+rnd()*7,rnd()*3,0,7);ctx.fill()}
 }
 if(falls){ctx.fillStyle='#516b60';ctx.fillRect(W*.25,H*.38,W*.22,H*.28);for(let i=0;i<20;i++){ctx.strokeStyle=i%3===0?'#edf5dfaa':'#b9e7d6aa';ctx.lineWidth=2+rnd()*W*.009;let x=W*(.29+rnd()*.12);ctx.beginPath();ctx.moveTo(x,H*.39);ctx.bezierCurveTo(x-W*.01,H*.49,x+W*.02,H*.55,x+W*.025,H*.65);ctx.stroke()}}
 if(!forest||lake||lotuses||falls){for(let i=0;i<(lotuses?70:18);i++){let x=rnd()*W,y=H*(.68+rnd()*.3),r=W*(.006+rnd()*.018);ctx.fillStyle='#6a9e69';ctx.beginPath();ctx.ellipse(x,y,r*1.7,r*.5,0,0,7);ctx.fill();if(i%3===0){for(let k=-2;k<=2;k++){ctx.save();ctx.translate(x,y);ctx.rotate(k*.4);ctx.fillStyle=k%2?'#e3a3b8':'#f3c4cc';ctx.beginPath();ctx.ellipse(0,-r*.8,r*.42,r*.9,0,0,7);ctx.fill();ctx.restore()}}}}
}

function lines(ctx,text,w){
 let result=[];
 for(const p of String(text).split(/\n/)){
  if(!p.trim()){result.push('');continue}
  let line='';
  for(const word of p.trim().split(/\s+/)){
   if(ctx.measureText(line?line+' '+word:word).width>w&&line){result.push(line);line=''}
   if(ctx.measureText(word).width>w){
    const chars=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('si',{granularity:'grapheme'}).segment(word)].map(x=>x.segment):[word];
    for(const c of chars){if(line&&ctx.measureText(line+c).width>w){result.push(line);line=''}line+=c}
   }else line+=(line?' ':'')+word;
  }if(line)result.push(line);
 }return result;
}
function textBlock(ctx,text,x,y,w,maxH,initial,min,weight,family,color){
 let size=initial,ls=[],height;
 while(size>=min){ctx.font=weight+' '+size+'px '+family;ls=lines(ctx,text,w);height=ls.reduce((n,t)=>n+(t?size*1.52:size*.52),0);if(height<=maxH)break;size-=2}
 if(size<min)throw Error('overflow');ctx.fillStyle=color;ctx.textBaseline='top';
 for(let t of ls){if(t)ctx.fillText(t,x,y);y+=t?size*1.52:size*.52}return y;
}
function lotus(ctx,x,y,size,color){ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);ctx.strokeStyle=color;ctx.lineWidth=2.7;ctx.lineJoin='round';for(let j=-2;j<=2;j++){ctx.save();ctx.rotate(j*.46);ctx.beginPath();ctx.moveTo(0,20);ctx.quadraticCurveTo(-24,-10,0,-48);ctx.quadraticCurveTo(24,-10,0,20);ctx.stroke();ctx.restore()}ctx.restore()}
window.SuttaPoster={attach(ar,d,q,l){
 const si=l==='si',tr=(a,b)=>si?a:b;
 const btn=add(ar,'button',tr('✦ Create — දහම් පෝස්ටරය','✦ Create Dhamma poster'));btn.type='button';btn.className='poster-create';
 let editor;
 btn.onclick=()=>{
 if(editor){editor.hidden=!editor.hidden;return}
 editor=add(ar,'section');editor.className='poster-editor';add(editor,'h3',tr('දහම් රූප නිර්මාණය','Dhamma poster studio'));
 add(editor,'small',tr('පෙළ සංස්කරණය කර මුල් සූත්‍ර සමඟ සසඳන්න. රූපය මේ උපාංගයේ නිර්මාණය වේ.','Edit and verify the text against the sources. The poster is composed on this device.'));
 function field(name,tag,value){add(editor,'label',name);let x=add(editor,tag);x.value=value;return x}
 const title=field(tr('මාතෘකාව','Title'),'input',cropWords(tidy(q),90));title.maxLength=100;
 const body=field(d.grounding?.generated===true?tr('දහම් සාරය (සංස්කරණය කළ හැක)','Editable Dhamma excerpt'):tr('මුල් මූලාශ්‍ර උපුටාගැනීම් (AI විග්‍රහයක් නොවේ)','Canonical excerpts (not AI interpretation)'),'textarea',extract(d));body.rows=5;body.maxLength=900;if(!body.value)add(editor,'small',tr('කෙටි සම්පූර්ණ පාඨයක් ස්වයංක්‍රීයව තෝරාගත නොහැකි විය. පහළ මුල් මූලාශ්‍රයෙන් සුදුසු පාඨයක් තෝරන්න.','No short complete passage was available automatically. Select a passage from the original sources below.'));
 const flow=field(tr('පෝස්ටරයට අමතර කරුණු (අවශ්‍ය නම්)','Optional poster notes — one point per line'),'textarea','');flow.rows=3;flow.maxLength=240;
 const refs=field(tr('මූලාශ්‍ර','Sources'),'input',(d.sources||[]).slice(0,3).map(s=>s.canonicalId||s.title||s.id).map(tidy).join(' · '));refs.maxLength=180;
 const controls=add(editor,'div');controls.className='poster-grid';
 function select(label,opts){let box=add(controls,'div');add(box,'label',label);let el=add(box,'select');for(const [v,n] of opts){let o=add(el,'option',n);o.value=v}return el}
 const size=select(tr('ප්‍රමාණය','Size'),[['portrait','1080 × 1350'],['square','1080 × 1080'],['landscape','1536 × 864'],['story','1080 × 1920']]);
 const theme=select(tr('වර්ණය','Theme'),[['green',tr('හරිත / රන්','Jade / gold')],['gold',tr('රන්වන්','Warm gold')]]);
 const font=select(tr('අකුරු','Font'),[['Noto Sans Sinhala','Noto Sans Sinhala'],['Abhaya Libre','Abhaya Libre']]);
 const bg={value:'illustrated',addEventListener(){}};
 let uploaded=null,uploadUrl=null,sceneSeed=crypto.getRandomValues(new Uint32Array(1))[0],artPrompt='peaceful lotus pond at sunrise',artOrigin='illustrated';
 const prompt=field(tr('ඔබට අවශ්‍ය රූපය විස්තර කරන්න','Describe your background'),'textarea',artPrompt);prompt.rows=3;prompt.maxLength=350;
 const make=add(editor,'button',tr('✦ අලුත් පසුබිමක් සාදන්න','✦ Create background'));make.type='button';
 const aiStatus=add(editor,'small','');
 const seenPresets=new Set();
 let presetList=null;
 function sceneCategory(p){
  const t=p.toLowerCase();
  // Only use a pre-generated image for familiar scene categories; custom descriptions
  // are not claimed to be matched by a generative model.
  if(/waterfall|දිය\s*ඇල්ල|දියඇල්ල/.test(t))return 'waterfall';
  if(/night|moon|රාත්‍රි|රාත්‍රී|සඳ/.test(t))return 'night';
  if(/lotus|pond|නෙළුම්|පොකුණ/.test(t))return 'lotus';
  if(/lake|විල|වැව/.test(t))return 'lake';
  if(/forest|woods|වනාන්තර|කැලෑ/.test(t))return 'forest';
  if(/temple|monastery|ආරාම|පන්සල|විහාර/.test(t))return 'temple';
  return null;
 }
 async function tryPreset(p){
  const category=sceneCategory(p);if(!category)return false;
  try{
   if(!presetList){const r=await fetch(assetBase+'presets/manifest.json',{cache:'no-cache',signal:AbortSignal.timeout(2000)});if(!r.ok)return false;const list=await r.json();if(!Array.isArray(list))return false;presetList=list.filter(v=>v&&/^(lotus|lake|forest|waterfall|night|temple)-[0-2]\.jpg$/.test(v.file)&&v.scene===v.file.split('-')[0]);}
   const available=presetList.filter(v=>v.scene===category&&!seenPresets.has(v.file));
   if(!available.length)return false;
   const v=available[sceneSeed%available.length],im=await Promise.race([load(assetBase+'presets/'+v.file),new Promise((_,rej)=>setTimeout(()=>rej(Error('timeout')),3000))]);
   seenPresets.add(v.file);uploaded=im;bg.value='upload';artOrigin='cpu-preset';return true;
  }catch{return false}
 }

 make.onclick=async()=>{
  const p=prompt.value.trim();if(p.length<3){aiStatus.textContent=tr('රූපය විස්තර කරන්න.','Describe the image.');return}
  make.disabled=true;aiStatus.textContent=tr('CPU මඟින් අලුත් AI රූපය නිර්මාණය කරමින්…','Creating a new CPU AI background…');artPrompt=p;sceneSeed=crypto.getRandomValues(new Uint32Array(1))[0];uploaded=null;bg.value='illustrated';artOrigin='illustrated';
  if(uploadUrl){URL.revokeObjectURL(uploadUrl);uploadUrl=null}
  try{
   // Only the server's configured CPU backend may generate a neural image.
   const r=await fetch('/api/poster-background',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:p,seed:sceneSeed}),signal:AbortSignal.timeout(72000)});
   if(r.ok){const blob=await r.blob();if(!/^image\/(?:png|jpeg|webp)$/.test(blob.type)||blob.size>12000000)throw Error('invalid image');uploadUrl=URL.createObjectURL(blob);uploaded=await load(uploadUrl);bg.value='upload';artOrigin='cpu-ai'}
  }catch{}
  if(!uploaded)await tryPreset(p);
  await render();aiStatus.textContent=artOrigin==='cpu-ai'?tr('AI පසුබිම සූදානම්.','AI background ready.'):artOrigin==='cpu-preset'?tr('CPU මඟින් පෙර නිර්මාණය කළ AI පසුබිමක්.','Previously CPU-generated AI background.'):tr('නව භූදර්ශනය සූදානම් (AI නොවේ).','New illustrated landscape (not AI).');make.disabled=false;
 };


 // Extract complete statements from the displayed answer, keeping citation markers.
 // Group them under the question; never infer causal arrows from list order.
 const diagram=add(editor,'details');diagram.className='auto-dhamma-diagram';
 add(diagram,'summary',tr('ස්වයංක්‍රීය ධර්ම සටහන','Automatic Dhamma diagram'));
 add(diagram,'small',tr('පිළිතුරේ කරුණු ස්වයංක්‍රීයව සටහනකට ගනී. රේඛා මඟින් කරුණු එකම මාතෘකාවට අදාළ බව පමණක් දක්වයි.','Automatically groups statements from the answer. Lines show topic membership, not causal relationships.'));
 const diagramGo=add(diagram,'button',tr('ස්වයංක්‍රීයව සටහන සාදන්න','Create diagram automatically'));diagramGo.type='button';
 const diagramStatus=add(diagram,'small',''),diagramView=add(diagram,'div');diagramView.style.cssText='overflow:auto;background:#fffdf6;border-radius:8px;margin-top:8px';
 const downloads=add(diagram,'div');downloads.className='poster-actions';
 const svgSave=add(downloads,'button','SVG'),diagramPng=add(downloads,'button',tr('සටහන PNG','Diagram PNG'));svgSave.type=diagramPng.type='button';svgSave.disabled=diagramPng.disabled=true;
 let svgText='',diagramCanvas=null,diagramReady=false;
 function points(){
  const text=(d.grounding?.generated===true?String(d.answer||''):sourceQuotes(d).join('\n')).replace(/<[^>]*>/g,'').replace(/\*\*|__/g,'').replace(/\r/g,'');
  const all=[];
  for(const line of text.split(/\n+/)){
   const t=line.replace(/^\s*(?:#{1,6}\s*|[-*•]\s*|\d+[.)]\s+)/,'').trim();
   // Avoid splitting decimal sutta numbers, and retain citation suffixes.
   const chunks=t.split(/(?<=[.!?।])\s+(?!\[S\d+\])/u);
   for(const raw of chunks){
    const v=raw.replace(/\s+/g,' ').trim();
    if(v.length>=24&&v.length<=260&&!/^(?:මූලාශ්‍ර|Sources|References|AI විග්‍රහයක් නොවේ|Based on the provided|සපයන ලද මූලාශ්‍ර)/i.test(v)&&!all.includes(v))all.push(v);
   }
  }
  // Citation-bearing statements first, while preserving the original order within each group.
  return [...all.filter(v=>/\[S\d+\]/.test(v)),...all.filter(v=>!/\[S\d+\]/.test(v))].slice(0,5);
 }
 async function makeDiagram(){
  diagramGo.disabled=true;svgSave.disabled=diagramPng.disabled=true;diagramView.replaceChildren();svgText='';diagramReady=false;
  try{
   const items=points();
   if(items.length<2){diagramStatus.textContent=tr('සටහනකට ප්‍රමාණවත් සම්පූර්ණ කරුණු දෙකක් පිළිතුරේ නොමැත.','The answer does not contain two suitable complete statements for a diagram.');return}
   await Promise.race([document.fonts.load('600 30px "Noto Sans Sinhala"','සිංහල ධර්මය'),new Promise(r=>setTimeout(r,2000))]).catch(()=>{});
   const W=960,margin=44,cardX=110,cardW=806,pad=30;
   const c=document.createElement('canvas'),measure=c.getContext('2d'),family='"Noto Sans Sinhala", sans-serif';
   measure.font='600 33px '+family;
   const heading=lines(measure,cropWords(tidy(q),140),W-2*margin-2*pad);
   const headH=heading.length*48+64;
   measure.font='400 28px '+family;
   const cards=items.map(t=>{const ls=lines(measure,t,cardW-pad*2-54);return {ls,h:Math.max(100,ls.length*44+48)}});
   const sourceNote=tr('පිළිතුරෙන් උපුටාගත් කරුණු • මුල් සූත්‍ර සමඟ සසඳන්න','Extracted from the answer • check against the original sources');
   const H=margin+headH+40+cards.reduce((n,x)=>n+x.h+24,0)+72;
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
   svg.setAttribute('xmlns',ns);svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width',W);svg.setAttribute('height',H);
   svg.setAttribute('role','img');svg.setAttribute('aria-label',tr('ස්වයංක්‍රීය ධර්ම කරුණු සටහන','Automatic Dhamma concept map'));
   const el=(tag,attrs,txt)=>{let n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(txt!==undefined)n.textContent=txt;svg.append(n);return n};
   c.width=1080;c.height=Math.ceil(H*1080/W);const ctx=c.getContext('2d');ctx.scale(1080/W,1080/W);
   function rect(x,y,w,h,r,fill,stroke){el('rect',{x,y,width:w,height:h,rx:r,fill,...(stroke?{stroke,'stroke-width':2}:{})});ctx.fillStyle=fill;rounded(ctx,x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
   function line(x1,y1,x2,y2){el('path',{d:'M'+x1+' '+y1+' H'+x2+' V'+y2,fill:'none',stroke:'#8ca99a','stroke-width':3});ctx.strokeStyle='#8ca99a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y1);ctx.lineTo(x2,y2);ctx.stroke()}
   function text(x,y,t,size,weight,color){el('text',{x,y,'font-family':'Noto Sans Sinhala, sans-serif','font-size':size,'font-weight':weight,fill:color},t);ctx.font=weight+' '+size+'px '+family;ctx.fillStyle=color;ctx.textBaseline='alphabetic';ctx.fillText(t,x,y)}
   rect(0,0,W,H,0,'#f9f7ee');
   rect(margin,margin,W-2*margin,headH,22,'#164b40');
   heading.forEach((v,i)=>text(margin+pad,margin+48+i*48,v,33,600,'#fff1c8'));
   const startY=margin+headH+40,spine=72;
   let cy=startY;
   line(spine,margin+headH,spine,startY+cards.slice(0,-1).reduce((n,x)=>n+x.h+24,0)+cards.at(-1).h/2);
   for(let i=0;i<cards.length;i++){
    const {ls,h}=cards[i];line(spine,cy+h/2,cardX,cy+h/2);
    rect(cardX,cy,cardW,h,18,'#e9f0e5','#a5bca8');
    text(cardX+pad,cy+47,String(i+1).padStart(2,'0'),24,600,'#557b67');
    ls.forEach((v,j)=>text(cardX+pad+54,cy+47+j*44,v,28,400,'#183e32'));
    cy+=h+24;
   }
   text(margin,H-30,sourceNote,20,400,'#49695c');
   svgText=new XMLSerializer().serializeToString(svg);
   svg.style.cssText='display:block;width:100%;height:auto';diagramView.append(svg);
   diagramCanvas=c;diagramReady=true;svgSave.disabled=diagramPng.disabled=false;
   diagramStatus.textContent=tr('පිළිතුරේ කරුණු '+items.length+'ක් ස්වයංක්‍රීයව එක් කළා.','Automatically added '+items.length+' statements from the answer.');
  }catch(e){diagramStatus.textContent=tr('සටහන සෑදීමට නොහැකි විය. නැවත උත්සාහ කරන්න.','Could not create the diagram. Try again.')}
  finally{diagramGo.disabled=false}
 }
 function diagramDownload(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 diagramGo.onclick=makeDiagram;
 diagram.addEventListener('toggle',()=>{if(diagram.open&&!diagramReady&&!diagramGo.disabled)makeDiagram()});
 svgSave.onclick=()=>{if(svgText)diagramDownload(new Blob([svgText],{type:'image/svg+xml'}),'suttago-dhamma-diagram.svg')};
 diagramPng.onclick=()=>{if(diagramCanvas)diagramCanvas.toBlob(b=>{if(b)diagramDownload(b,'suttago-dhamma-diagram.png')},'image/png')};

 const actions=add(editor,'div');actions.className='poster-actions';const preview=add(actions,'button',tr('රූපය සාදන්න','Render poster')),png=add(actions,'button','PNG'),jpg=add(actions,'button','JPG');for(let x of [preview,png,jpg])x.type='button';png.disabled=jpg.disabled=true;
 const status=add(editor,'small',''),canvas=add(editor,'canvas');canvas.setAttribute('aria-label',tr('දහම් පෝස්ටර පෙරදසුන','Dhamma poster preview'));
 let revision=0;
 async function render(){
  const run=++revision;preview.disabled=true;png.disabled=jpg.disabled=true;status.textContent=tr('රූපය සකසමින්…','Rendering…');
  try{
   const dims={portrait:[1080,1350],square:[1080,1080],landscape:[1536,864],story:[1080,1920]}[size.value];const [W,H]=dims;
   const family='"'+font.value+'", "Noto Sans Sinhala", sans-serif';
   await Promise.race([document.fonts.load('700 48px "'+font.value+'"','සිංහල ධර්මය').then(()=>document.fonts.ready),new Promise(r=>setTimeout(r,4000))]);
   if(si&&!document.fonts.check('700 48px "'+font.value+'"','සිංහල ධර්මය'))throw Error('font');
   let img=null,used='vector';
   if(bg.value==='upload'){if(!uploaded)throw Error('upload');img=uploaded;used='upload'}
   else if(bg.value!=='illustrated'){try{img=await load(assetBase+bg.value);used='ai-preset'}catch{status.textContent=tr('AI පසුබිම තවම නොලැබේ. දෛශික පසුබිම භාවිත වේ.','AI preset unavailable; using vector background.');}}
   if(run!==revision)return;
   canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');scenic(ctx,W,H,theme.value,artPrompt,sceneSeed);if(img)cover(ctx,img,0,0,W,H);
   const landscape=W>H,margin=Math.round(W*.045),panelX=landscape?Math.round(W*.47):margin,panelY=landscape?margin:Math.round(H*.32),panelW=W-panelX-margin,panelH=H-panelY-margin;
   ctx.fillStyle=theme.value==='gold'?'rgba(31,27,20,.87)':'rgba(13,37,32,.88)';rounded(ctx,panelX,panelY,panelW,panelH,28);ctx.fill();ctx.strokeStyle='#e7ca8d';ctx.lineWidth=2;ctx.stroke();
   const pad=landscape?35:42,x=panelX+pad,w=panelW-pad*2;let y=panelY+pad;
   lotus(ctx,x+24,y+20,43,'#ecd4a0');ctx.font='600 21px '+family;ctx.fillStyle='#ecd4a0';ctx.textBaseline='top';ctx.fillText('SUTTAGO  ·  DHAMMA',x+58,y+8);y+=54;
   const steps=flow.value.split('\n').map(x=>x.trim()).filter(Boolean);if(steps.length>4)throw Error('steps');
   const bottom=panelY+panelH-pad,footerH=refs.value.trim()?78:35,flowH=steps.length?Math.min(steps.length*57+16,245):0;
   y=textBlock(ctx,title.value||tr('ධර්ම විග්‍රහය','Dhamma reflection'),x,y,w,landscape?130:160,landscape?48:54,30,'700',family,'#f9e2ad')+18;
   ctx.strokeStyle='#d6bc83';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();y+=20;
   if(body.value.trim())y=textBlock(ctx,body.value,x,y,w,bottom-y-footerH-flowH-12,landscape?30:36,23,'400',family,'#fffdf4')+12;
   if(steps.length){for(let i=0;i<steps.length;i++){ctx.fillStyle='rgba(236,212,160,.12)';rounded(ctx,x,y,w,45,9);ctx.fill();textBlock(ctx,steps[i],x+12,y+5,w-24,36,26,20,'600',family,'#fbe3ae');y+=49;if(i<steps.length-1){ctx.fillStyle='#ecd4a0';ctx.font='20px sans-serif';ctx.fillText('·',x+w/2-7,y-3);y+=8}}}
   if(refs.value.trim())textBlock(ctx,tr('මූලාශ්‍ර: ','Sources: ')+refs.value,x,bottom-footerH+5,w,footerH-8,22,17,'400',family,'#ecd4a0');
   status.textContent=(used==='ai-preset'?tr('AI පෙරනිමි පසුබිම + සංස්කරණය කළ පෙළ','AI-generated preset + editable text'):used==='upload'?(artOrigin==='cpu-preset'?tr('පෙර නිර්මාණය කළ AI පසුබිම + පෙළ','Pre-generated AI background + text'):tr('CPU AI පසුබිම + පෙළ','CPU AI background + text')):tr('දෛශික පසුබිම (AI නොවේ) + පෙළ','Vector background (not AI) + text'))+' · '+W+' × '+H;
   png.disabled=jpg.disabled=false;
  }catch(e){status.textContent=e.message==='overflow'?tr('පෙළ වැඩියි. කෙටි කරන්න හෝ දිගු ප්‍රමාණයක් තෝරන්න.','Text is too long. Shorten it or select a taller size.'):e.message==='font'?tr('සිංහල font එක load වූයේ නැත. නැවත උත්සාහ කරන්න.','Sinhala font could not load. Try again.'):e.message==='steps'?tr('ගැලීම් කරුණු 4ක් දක්වා ඇතුළත් කරන්න.','Use up to four flow steps.'):tr('රූපය සකස් කළ නොහැකි විය.','Could not render poster.')}
  finally{if(run===revision)preview.disabled=false}
 }
 function save(type){canvas.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='suttago-dhamma.'+(type==='image/png'?'png':'jpg');a.click();setTimeout(()=>URL.revokeObjectURL(u),30000)},type,.95)}
 preview.onclick=render;png.onclick=()=>save('image/png');jpg.onclick=()=>save('image/jpeg');
 for(const x of [title,body,flow,refs,size,theme,font,bg])x.addEventListener('input',()=>{png.disabled=jpg.disabled=true;status.textContent=tr('වෙනස්කම් ඇත. නැවත රූපය සාදන්න.','Changes made. Render again.')});
 render();
 };
}};
})();