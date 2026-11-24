const handler=require('../api/ask.js');
const assert=require('node:assert/strict');
async function request(q,lang='si',mode='deep'){
 let output;const res={setHeader(){},status(){return res},json(x){output=x;return res},end(){return res}};
 const start=Date.now();
 await handler({method:'POST',body:{q,lang,mode,evidenceOnly:true},headers:{},query:{}},res);
 assert(output&&Array.isArray(output.sources),q+' missing sources');
 assert.equal(output.grounding?.generated,false,'retrieval-only must not call inference');
 for(const src of output.sources){assert.equal(src.evidenceType,'paired_canonical_passage');assert(src.passages?.length&&src.passages.every(p=>p.text&&p.pali&&p.locator));assert(!src.id.startsWith('thri:'));}
 console.log(JSON.stringify({q,ms:Date.now()-start,facets:output.research?.facets,coverage:output.grounding?.covered,sources:output.sources.map(s=>({id:s.id,title:s.title,sourceTier:s.sourceTier,pages:s.evidencePages,scanned:s.scannedPassages})),graph:output.research?.graph,verified:output.grounding?.verified}));
 return output;
}
(async()=>{
 const cases=[
 ['චිත්ත අභ්‍යන්තර ගැන ඉගැන්වීම්','si',['sn-2-1-7-1','mn-1-1-10','mn-1-2-10','an-1-5-9']],
 ['සිතේ ගැඹුර ගැන කියන්න','si',['sn-2-1-7-1','mn-1-1-10','mn-1-2-10','an-1-5-9']],
 ['චිත්තභාවනා සහ චිත්තානුපස්සනා අතර වෙනස','si',['mn-1-1-10']],
 ['පටිච්චසමුප්පාදය ගැන විස්තර කරන්න','si',['sn-2-1-1-1','sn-2-1-2-10']],
 ['What is dependent origination?','en',['sn12.1','sn12.20']],
 ['What is compassion?','en',[]],
 ['සමථය සහ විපස්සනා අතර වෙනස','si',[]],
 ['xyznonexistenttoken','en',[]],
 ['mn10','si',['mn-1-1-10']],
 ['mn10','en',['mn10']]
 ];
 for(const [q,l,expected] of cases){
  const out=await request(q,l);
  if(expected.length)assert(out.sources.some(s=>expected.some(id=>s.id===id||s.id==='bjt:'+id||s.id==='dto:'+id)),q+' expected at least one known source');
  if(q==='චිත්ත අභ්‍යන්තර ගැන ඉගැන්වීම්'){assert(!out.sources.some(s=>s.id==='bjt:an-10-1-5-5'),'Irrelevant royal palace source');}
  if(q==='xyznonexistenttoken')assert.equal(out.sources.length,0);
 }
 console.log('Retrieval regression passed');
})().catch(e=>{console.error(e.message);process.exitCode=1});
