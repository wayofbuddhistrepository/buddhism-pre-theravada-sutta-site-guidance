// CPU-only image endpoint. No external GPU, no paid inference fallback.
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'method'});
 const prompt=req.body?.prompt;const seed=Number.isInteger(req.body?.seed)&&req.body.seed>=0&&req.body.seed<=4294967295?req.body.seed:Math.floor(Math.random()*4294967296);
 if(typeof prompt!=='string'||prompt.trim().length<3||prompt.length>350)return res.status(400).json({error:'prompt'});
 const endpoint=process.env.SUTTA_CPU_IMAGE_URL,key=process.env.SUTTA_CPU_IMAGE_KEY;
 if(!endpoint||!key)return res.status(503).json({error:'cpu_unavailable'});
 try{
  const u=new URL(endpoint);
  if(u.protocol!=='https:'||!u.hostname.endsWith('.hf.space')||u.username||u.password||u.port||u.pathname!=='/generate'||u.search||u.hash)throw Error('endpoint');
  const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({prompt:prompt.trim(),seed}),redirect:'error',signal:AbortSignal.timeout(10000)});
  const mime=(r.headers.get('content-type')||'').split(';')[0];if(!r.ok||!['image/png','image/jpeg','image/webp'].includes(mime))throw Error('image');
  const reader=r.body.getReader();let chunks=[],n=0;try{while(true){let x=await reader.read();if(x.done)break;n+=x.value.byteLength;if(n>4000000)throw Error('size');chunks.push(Buffer.from(x.value))}}finally{await reader.cancel().catch(()=>{})}
  res.setHeader('Content-Type',mime);return res.status(200).send(Buffer.concat(chunks));
 }catch{return res.status(503).json({error:'cpu_unavailable'})}
};
