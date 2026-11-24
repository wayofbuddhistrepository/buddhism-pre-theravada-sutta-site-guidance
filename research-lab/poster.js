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
 const bg=select(tr('පසුබිම','Background'),[['illustrated',tr('දෛශික භූදර්ශනය (AI නොවේ)','Vector landscape (not AI)')],['anime.jpg',tr('AI Anime — CPU පරීක්ෂණ රූපය','AI Anime — CPU-generated preset')],['openvino.jpg',tr('AI OpenVINO — CPU පරීක්ෂණ රූපය','AI OpenVINO — CPU-generated preset')],['upload',tr('ඔබේ රූපය','Your image')]]);
 const upload=field(tr('ඔබේ රූපයක් තෝරන්න (විකල්ප)','Upload your own background (optional)'),'input','');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';let uploaded=null,uploadUrl=null;
 upload.onchange=async()=>{let f=upload.files[0];if(!f)return;if(f.size>12000000){status.textContent=tr('රූපය 12MB ට අඩු විය යුතුයි.','Image must be under 12 MB.');return}try{if(uploadUrl)URL.revokeObjectURL(uploadUrl);uploadUrl=URL.createObjectURL(f);uploaded=await load(uploadUrl);bg.value='upload';await render()}catch{status.textContent=tr('රූපය විවෘත කළ නොහැක.','Image could not be opened.')}};

 // Direct, opt-in community GPU generation; no server key or automatic job spam.
 const ai=add(editor,'details');add(ai,'summary',tr('AI පසුබිමක් අලුතින් නිර්මාණය කරන්න','Generate a new AI background'));
 add(ai,'small',tr('AI Horde ප්‍රජා GPU සේවාවට රූප prompt එක පමණක් යවයි. පෞද්ගලික තොරතුරු ඇතුළත් නොකරන්න. Queue සීමා ඇත.','Only the image prompt is sent to the community AI Horde service. Do not enter private information. Queue limits apply.'));
 const scene=add(ai,'select');
 const scenes=[['lotus','Peaceful lotus pond near a Buddhist forest monastery, morning mist, golden sunbeams'],['lake','Calm mountain lake, reflections, blue green water, soft dawn light'],['forest','Tranquil green forest, winding stone path, gentle stream, sunlit trees'],['waterfall','Peaceful waterfall garden, mossy rocks, lotus blossoms, warm sunset'],['custom','']];
 for(const [v,t] of scenes){let o=add(scene,'option',tr(({lotus:'නෙළුම් පොකුණ',lake:'නිසල විල',forest:'සන්සුන් වනාන්තරය',waterfall:'දිය ඇල්ල',custom:'මගේම Prompt එක'})[v],v==='custom'?'Custom prompt':v));o.value=v;}
 const prompt=add(ai,'textarea');prompt.rows=3;prompt.maxLength=350;prompt.value=scenes[0][1];scene.onchange=()=>{prompt.value=scenes.find(x=>x[0]===scene.value)[1]};
 const model=add(ai,'select');for(const m of ['Auto','Nova Anime XL','Counterfeit','Anything v3','Juggernaut XL']){let o=add(model,'option',m);o.value=m}
 const make=add(ai,'button',tr('AI රූපය සාදන්න','Generate AI image')),halt=add(ai,'button',tr('නවත්වන්න','Cancel'));make.type=halt.type='button';halt.disabled=true;
 const aiStatus=add(ai,'small','');let job=null,ctrl=null;const base='https://aihorde.net/api/v2';
 const headers={'Content-Type':'application/json','apikey':'0000000000','Client-Agent':'SuttaGo:1.0:research-lab'};
 async function call(path,opts={}){let r=await fetch(base+path,{...opts,headers,signal:opts.signal||AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
 async function cancel(){const id=job;job=null;ctrl?.abort();if(id)try{await call('/generate/status/'+id,{method:'DELETE'})}catch{}}
 halt.onclick=()=>{aiStatus.textContent=tr('නවත්වන ලදී','Cancelled');cancel()};
 make.onclick=async()=>{
  if(ctrl)return;const p=prompt.value.trim();if(p.length<3){aiStatus.textContent=tr('Prompt එකක් ලියන්න','Enter a prompt');return}
  make.disabled=true;halt.disabled=false;ctrl=new AbortController();const signal=ctrl.signal;
  try{
   aiStatus.textContent=tr('GPU සේවාවට යොමු කරමින්…','Submitting to GPU service…');
   const available=await call('/status/models?type=image',{signal});
   const allowed=['Nova Anime XL','Counterfeit','Anything v3','Juggernaut XL'];
   const active=allowed.filter(m=>available.some(x=>x.name===m&&x.count>0));
   let candidates=model.value==='Auto'?active:active.filter(x=>x===model.value);
   if(!candidates.length)throw Error('No workers for selected model');
   const data={prompt:p+' , beautiful detailed hand painted anime landscape, peaceful atmosphere, no people, no letters ### text, lettering, watermark, explicit content',params:{width:512,height:512,steps:20,n:1,sampler_name:'k_euler',cfg_scale:7},models:candidates,nsfw:false,censor_nsfw:true,r2:true,shared:false,slow_workers:true};
   const r=await call('/generate/async',{method:'POST',body:JSON.stringify(data),signal});
   if(!/^[a-f0-9-]{36}$/i.test(r.id||''))throw Error('Invalid job');
   job=r.id;
   const deadline=Date.now()+180000;
   while(Date.now()<deadline&&!signal.aborted){
    await new Promise(r=>setTimeout(r,5000));if(signal.aborted)break;
    const c=await call('/generate/check/'+job,{signal});
    aiStatus.textContent=tr('GPU පෝලිම: ','GPU queue: ')+(c.queue_position??'?')+' · '+tr('ඇස්තමේන්තුගත තත්පර: ','Estimated seconds: ')+(c.wait_time??'?');
    if(c.faulted||c.is_possible===false)throw Error('No available worker');
    if(!c.done)continue;
    const d=await call('/generate/status/'+job,{signal});job=null;
    const g=d.generations?.find(x=>!x.censored&&x.state!=='faulted'&&x.state!=='censored'&&typeof x.img==='string');
    if(!g)throw Error('No usable image');
    let img;
    if(/^https:\/\//.test(g.img)){
     const u=new URL(g.img);if(u.username||u.password)throw Error('Invalid image');
     const f=await fetch(u.href,{signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!f.ok)throw Error('Image unavailable');
     const blob=await f.blob();if(!/^image\//.test(blob.type)||blob.size>12000000)throw Error('Invalid image');
     if(uploadUrl)URL.revokeObjectURL(uploadUrl);uploadUrl=URL.createObjectURL(blob);img=await load(uploadUrl);
    }else{if(g.img.length>16000000||!/^[A-Za-z0-9+/=]+$/.test(g.img))throw Error('Invalid image');img=await load('data:image/webp;base64,'+g.img)}
    uploaded=img;bg.value='upload';await render();aiStatus.textContent=tr('AI පසුබිම සූදානම්: ','AI background ready: ')+g.model;return;
   }
   if(!signal.aborted)throw Error('Queue timeout');
  }catch(e){if(!signal.aborted)aiStatus.textContent=tr('AI Horde සේවාව ලබාගත නොහැක. වෙනත් පසුබිමක් තෝරන්න. ','AI Horde unavailable. Choose another background. ')+String(e.message).slice(0,80)}
  finally{await cancel();ctrl=null;make.disabled=false;halt.disabled=true}
 };

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
   canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');decorative(ctx,W,H,theme.value);if(img)cover(ctx,img,0,0,W,H);
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
   status.textContent=(used==='ai-preset'?tr('AI පෙරනිමි පසුබිම + සංස්කරණය කළ පෙළ','AI-generated preset + editable text'):used==='upload'?tr('ඔබේ පසුබිම + පෙළ','Your background + text'):tr('දෛශික පසුබිම (AI නොවේ) + පෙළ','Vector background (not AI) + text'))+' · '+W+' × '+H;
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