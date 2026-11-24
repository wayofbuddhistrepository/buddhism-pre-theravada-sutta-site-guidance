/* Local poster compositor: no image API charge, no uploads of user text or images. */
(()=>{
const $=(root,s)=>root.querySelector(s);
const assetBase='https://raw.githubusercontent.com/wayofbuddhistrepository/buddhism-pre-theravada-sutta-site-guidance/suttago-poster-assets/';
const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700&family=Abhaya+Libre:wght@400;600;700&display=swap';document.head.append(fonts);
const styles=document.createElement('style');styles.textContent='.poster-editor{border:1px solid #d5dfd4;background:#fafaf5;border-radius:14px;padding:16px;margin-top:16px}.poster-editor label{display:block;font-size:14px;color:#49665b;margin-top:9px}.poster-editor input:not([type=file]),.poster-editor textarea,.poster-editor select{box-sizing:border-box;width:100%;font:inherit;padding:8px;border:1px solid #a9b9af;border-radius:8px;background:white;color:#183c33}.poster-editor textarea{margin:0}.poster-editor canvas{display:block;width:100%;max-height:660px;object-fit:contain;margin:12px 0;background:#eee}.poster-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.poster-editor button{font-size:15px}.poster-editor button[disabled]{opacity:.5}.poster-editor small{display:block}.poster-editor .poster-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.poster-create{margin-top:10px}';document.head.append(styles);
const add=(p,t,v)=>{const n=document.createElement(t);if(v!==undefined)n.textContent=v;p.append(n);return n};
const tidy=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/\*\*|__|^#{1,6}\s*/gm,'').replace(/\[S\d+\]/g,'').replace(/\s+/g,' ').trim();
function cropWords(s,n){const w=Array.from(s);if(w.length<=n)return s;const sub=w.slice(0,n).join('');const i=sub.lastIndexOf(' ');return (i>n*.65?sub.slice(0,i):sub)+'…'}
function extract(d){
 const lines=String(d.answer||'').split(/\n+/).map(x=>x.replace(/^\s*[-*•]\s*/,'').trim()).filter(Boolean);
 const substantive=lines.filter(x=>tidy(x).length>55&&!/^(?:සපයන ලද|පහත දැක්වෙන්නේ|Based on the provided)/i.test(x));
 return substantive.slice(0,3).map(x=>cropWords(tidy(x),210)).join('\n\n');
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
 const sx=W*(.26+rnd()*.17),sy=H*.19;let glow=ctx.createRadialGradient(sx,sy,0,sx,sy,W*.35);glow.addColorStop(0,'#fff9db');glow.addColorStop(.2,night?'#d9e7ff77':'#fff0b4aa');glow.addColorStop(1,'#fff0');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.fillStyle=night?'#e9f0f8':'#fff4cd';ctx.beginPath();ctx.arc(sx,sy,W*.043,0,7);ctx.fill();
 for(let j=0;j<5;j++){let base=H*(.34+j*.075);ctx.fillStyle=['#a5b6ba','#849f9e','#618b81','#477464','#285d50'][j];ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,base);for(let i=0;i<=24;i++)ctx.lineTo(i*W/24,base+Math.sin(i*.63+j)*H*.055+(rnd()-.5)*H*.035);ctx.lineTo(W,H);ctx.closePath();ctx.fill()}
 const waterY=H*.61;const water=ctx.createLinearGradient(0,waterY,0,H);water.addColorStop(0,'#91b2a4');water.addColorStop(1,'#285d63');ctx.fillStyle=water;ctx.fillRect(0,waterY,W,H-waterY);
 for(let i=0;i<220;i++){let y=waterY+rnd()*(H-waterY),x=rnd()*W;ctx.strokeStyle=i%5===0?'#f5ddac70':'#c9e5cd40';ctx.lineWidth=1+rnd()*2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+10+rnd()*W*.13,y);ctx.stroke()}
 function tree(x,y,h){let thick=h*.075;ctx.fillStyle='#254a40';ctx.beginPath();ctx.moveTo(x-thick,y);ctx.quadraticCurveTo(x+thick,y-h*.6,x-thick*.2,y-h);ctx.lineTo(x+thick*.4,y-h);ctx.quadraticCurveTo(x+thick*2,y-h*.5,x+thick,y);ctx.fill();for(let i=0;i<50;i++){let ang=rnd()*6.28,rr=Math.sqrt(rnd())*h*.32,xx=x+Math.cos(ang)*rr,yy=y-h*.8+Math.sin(ang)*rr*.65;ctx.fillStyle=['#275d48','#326d51','#4d8460','#80a96c','#b3c787'][Math.floor(rnd()*5)];ctx.beginPath();ctx.ellipse(xx,yy,h*(.06+rnd()*.095),h*(.04+rnd()*.07),rnd()*3,0,7);ctx.fill()}}
 for(let i=0;i<(forest?16:8);i++){let x=W*(rnd()<.5?rnd()*.3:.72+rnd()*.28);tree(x,H*(.52+rnd()*.14),H*(.15+rnd()*.3))}
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
 const body=field(tr('දහම් සාරය (සංස්කරණය කළ හැක)','Editable Dhamma excerpt'),'textarea',extract(d)||cropWords(tidy(d.answer),400));body.rows=5;body.maxLength=900;
 const flow=field(tr('ගැලීම් සටහන — අවශ්‍ය නම්, එක් පේළියකට එක් කරුණක්','Optional flow diagram — one step per line'),'textarea','');flow.rows=3;flow.maxLength=240;
 const refs=field(tr('මූලාශ්‍ර','Sources'),'input',(d.sources||[]).slice(0,3).map(s=>s.canonicalId||s.title||s.id).map(tidy).join(' · '));refs.maxLength=180;
 const controls=add(editor,'div');controls.className='poster-grid';
 function select(label,opts){let box=add(controls,'div');add(box,'label',label);let el=add(box,'select');for(const [v,n] of opts){let o=add(el,'option',n);o.value=v}return el}
 const size=select(tr('ප්‍රමාණය','Size'),[['portrait','1080 × 1350'],['square','1080 × 1080'],['landscape','1536 × 864'],['story','1080 × 1920']]);
 const theme=select(tr('වර්ණය','Theme'),[['green',tr('හරිත / රන්','Jade / gold')],['gold',tr('රන්වන්','Warm gold')]]);
 const font=select(tr('අකුරු','Font'),[['Noto Sans Sinhala','Noto Sans Sinhala'],['Abhaya Libre','Abhaya Libre']]);
 const bg={value:'illustrated',addEventListener(){}};
 let uploaded=null,uploadUrl=null,sceneSeed=0,artPrompt='peaceful lotus pond at sunrise',artOrigin='illustrated';
 const prompt=field(tr('ඔබට අවශ්‍ය රූපය විස්තර කරන්න','Describe your background'),'textarea',artPrompt);prompt.rows=3;prompt.maxLength=350;
 const make=add(editor,'button',tr('✦ අලුත් පසුබිමක් සාදන්න','✦ Create background'));make.type='button';
 const aiStatus=add(editor,'small','');
 make.onclick=async()=>{
  const p=prompt.value.trim();if(p.length<3){aiStatus.textContent=tr('රූපය විස්තර කරන්න.','Describe the image.');return}
  make.disabled=true;artPrompt=p;sceneSeed++;uploaded=null;bg.value='illustrated';artOrigin='illustrated';
  if(uploadUrl){URL.revokeObjectURL(uploadUrl);uploadUrl=null}
  try{
   // Only the server's configured CPU backend may generate a neural image.
   const r=await fetch('/api/poster-background',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:p}),signal:AbortSignal.timeout(12000)});
   if(r.ok){const blob=await r.blob();if(!/^image\/(?:png|jpeg|webp)$/.test(blob.type)||blob.size>12000000)throw Error('invalid image');uploadUrl=URL.createObjectURL(blob);uploaded=await load(uploadUrl);bg.value='upload';artOrigin='cpu-ai'}
  }catch{}
  await render();aiStatus.textContent=artOrigin==='cpu-ai'?tr('AI පසුබිම සූදානම්.','AI background ready.'):tr('ක්ෂණික භූදර්ශනය සූදානම් (AI නොවේ).','Instant illustration ready (not AI).');make.disabled=false;
 };

 const diagram=add(editor,'details');add(diagram,'summary',tr('උසස් ගැලීම් සටහන (Mermaid)','Advanced flowchart (Mermaid)'));
 add(diagram,'small',tr('මුල් සූත්‍රයට අනුව කරුණු අනුපිළිවෙළින් ලියන්න. ඊතල මඟින් සම්බන්ධතාවයක් දක්වන නිසා එය නිවැරදිද පරීක්ෂා කරන්න.','Enter source-verified steps in order. Check that the arrows express the intended relationship.'));
 const diagramInput=add(diagram,'textarea');diagramInput.rows=5;diagramInput.maxLength=1000;diagramInput.placeholder=tr('එක් පේළියකට එක් කරුණක් (2–12)','One step per line (2–12)');
 const diagramGo=add(diagram,'button',tr('ගැලීම් සටහන සාදන්න','Render flowchart'));diagramGo.type='button';
 const diagramStatus=add(diagram,'small','');const diagramView=add(diagram,'div');diagramView.style.cssText='overflow:auto;background:white;padding:10px;margin-top:8px;border-radius:8px';
 const svgSave=add(diagram,'button','SVG');svgSave.type='button';svgSave.disabled=true;let svgText='';
 diagramGo.onclick=async()=>{
  diagramGo.disabled=true;svgSave.disabled=true;diagramView.replaceChildren();svgText='';
  try{
   const steps=diagramInput.value.split(/\n/).map(x=>x.trim()).filter(Boolean);
   if(steps.length<2||steps.length>12||steps.some(x=>x.length>100||! /^[\p{L}\p{M}\p{N}\s.,:;()\-–—]+$/u.test(x)))throw Error('invalid');
   diagramStatus.textContent=tr('සටහන නිර්මාණය වෙමින්…','Rendering diagram…');
   const mermaid=(await import('https://cdn.jsdelivr.net/npm/mermaid@11.12.2/dist/mermaid.esm.min.mjs')).default;
   await document.fonts.ready;
   mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',flowchart:{htmlLabels:false},themeVariables:{fontFamily:'Noto Sans Sinhala, sans-serif',fontSize:'18px',primaryColor:'#eef5e7',primaryTextColor:'#163d31',primaryBorderColor:'#668973',lineColor:'#64816e'}});
   const code='flowchart TD\n'+steps.map((v,i)=>'N'+i+'["'+v+'"]').join('\n')+'\n'+steps.slice(1).map((v,i)=>'N'+i+' --> N'+(i+1)).join('\n');
   const result=await mermaid.render('suttaFlow'+Date.now(),code);
   const parsed=new DOMParser().parseFromString(result.svg,'image/svg+xml');if(parsed.querySelector('parsererror,script,foreignObject'))throw Error('invalid svg');
   const svg=parsed.documentElement;for(const el of svg.querySelectorAll('*'))for(const at of [...el.attributes])if(at.name.startsWith('on')||(/href$/i.test(at.name)&&!at.value.startsWith('#')))el.removeAttribute(at.name);
   svg.setAttribute('width','100%');svg.setAttribute('height','auto');diagramView.append(document.importNode(svg,true));svgText=new XMLSerializer().serializeToString(svg);svgSave.disabled=false;
   diagramStatus.textContent=tr('SVG සටහන සූදානම්. පෝස්ටරයට දැනට වෙනම කෙටි ගැලීම් සටහන භාවිත කරන්න.','SVG ready. Use the separate short flow field for the poster itself.');
  }catch(e){diagramStatus.textContent=e.message==='invalid'?tr('කරුණු 2–12ක්, පේළියකට අකුරු 100ක් දක්වා ලියන්න.','Use 2–12 steps, up to 100 characters per line.'):tr('Mermaid සටහන සෑදීමට නොහැකි විය.','Mermaid diagram unavailable.')}
  finally{diagramGo.disabled=false}
 };
 svgSave.onclick=()=>{if(!svgText)return;const url=URL.createObjectURL(new Blob([svgText],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='suttago-flow.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)};

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
   if(steps.length){for(let i=0;i<steps.length;i++){ctx.fillStyle='rgba(236,212,160,.12)';rounded(ctx,x,y,w,45,9);ctx.fill();textBlock(ctx,steps[i],x+12,y+5,w-24,36,26,20,'600',family,'#fbe3ae');y+=49;if(i<steps.length-1){ctx.fillStyle='#ecd4a0';ctx.font='20px sans-serif';ctx.fillText('↓',x+w/2-7,y-3);y+=8}}}
   if(refs.value.trim())textBlock(ctx,tr('මූලාශ්‍ර: ','Sources: ')+refs.value,x,bottom-footerH+5,w,footerH-8,22,17,'400',family,'#ecd4a0');
   status.textContent=(used==='ai-preset'?tr('AI පෙරනිමි පසුබිම + සංස්කරණය කළ පෙළ','AI-generated preset + editable text'):used==='upload'?tr('CPU AI පසුබිම + පෙළ','CPU AI background + text'):tr('දෛශික පසුබිම (AI නොවේ) + පෙළ','Vector background (not AI) + text'))+' · '+W+' × '+H;
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