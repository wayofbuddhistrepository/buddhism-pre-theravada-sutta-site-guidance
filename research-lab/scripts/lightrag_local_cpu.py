"""Experimental real LightRAG index + local CPU LLM, on a tiny canonical corpus."""
import asyncio, json, os, pathlib, subprocess, time, urllib.request
from huggingface_hub import hf_hub_download
from sentence_transformers import SentenceTransformer
from lightrag import LightRAG, QueryParam
from lightrag.utils import EmbeddingFunc
ROOT=pathlib.Path("/tmp/sutta-lightrag")
ROOT.mkdir(exist_ok=True)
model=hf_hub_download("bartowski/google_gemma-4-E4B-it-GGUF","google_gemma-4-E4B-it-Q4_K_M.gguf",revision="029e94146666900b08caf49a3b47b413dfa8ec66")
exe=next(pathlib.Path("/tmp/sutta-llama").rglob("llama-server"))
log=open("/tmp/sutta-graph-model.log","w")
proc=subprocess.Popen([str(exe),"-m",model,"-ngl","0","-c","8192","-t","4","--reasoning-budget","128","--host","127.0.0.1","--port","18391","--parallel","1"],stdout=log,stderr=subprocess.STDOUT)
def call(prompt,system=None,history=None):
    messages=[]
    if system:messages.append({"role":"system","content":system})
    messages.extend(history or [])
    messages.append({"role":"user","content":prompt})
    body={"messages":messages,"max_tokens":1400,"temperature":0.1,"chat_template_kwargs":{"enable_thinking":False}}
    req=urllib.request.Request("http://127.0.0.1:18391/v1/chat/completions",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
    c=json.load(urllib.request.urlopen(req,timeout=400))["choices"][0]
    if c.get("finish_reason")=="length":raise RuntimeError("truncated graph-model output")
    return c["message"].get("content") or ""
async def main():
    for i in range(120):
        if proc.poll() is not None:raise RuntimeError("model failed to load")
        try:
            if urllib.request.urlopen("http://127.0.0.1:18391/health",timeout=2).status==200:break
        except Exception:await asyncio.sleep(2)
    else:raise RuntimeError("model health timeout")
    embed=SentenceTransformer("BAAI/bge-m3",revision="5617a9f61b028005a4858fdac845db406aefb181",device="cpu")
    async def enc(texts,**kwargs):
        return await asyncio.to_thread(embed.encode,texts,normalize_embeddings=True,batch_size=4)
    async def llm(prompt,system_prompt=None,history_messages=None,**kwargs):
        return await asyncio.to_thread(call,prompt,system_prompt,history_messages)
    rag=LightRAG(working_dir=str(ROOT),llm_model_func=llm,llm_model_name="gemma-4-e4b-local",llm_model_max_async=1,embedding_func=EmbeddingFunc(embedding_dim=1024,max_token_size=8192,func=enc),embedding_func_max_async=1,chunk_token_size=400,chunk_overlap_token_size=30)
    await rag.initialize_storages()
    try:
        docs=[]
        for uid,sub,terms in [("sn12.61","sn/sn12",["monkey","mind","consciousness"]),("mn10","mn",["mind with","mind without"])]:
            url=f"https://raw.githubusercontent.com/suttacentral/bilara-data/published/translation/en/sujato/sutta/{sub}/{uid}_translation-en-sujato.json"
            d=json.load(urllib.request.urlopen(url,timeout=20))
            passage=" ".join(v for v in d.values() if any(t in v.lower() for t in terms))[:1100]
            assert passage
            docs.append((uid,passage))
        for uid,passage in docs:
            await rag.ainsert(uid+"\n"+passage,file_paths="https://suttacentral.net/"+uid+"/en/sujato")
        context=await rag.aquery("What does the canon say about the changing nature of mind and observation of mental states?",param=QueryParam(mode="mix",only_need_context=True,top_k=5))
        print("Graph retrieval context:",str(context)[:3000])
        graph=list(ROOT.rglob("*.graphml"))
        import networkx as nx
        sizes=[(g.name,nx.read_graphml(g).number_of_nodes(),nx.read_graphml(g).number_of_edges()) for g in graph]
        print("Graph nodes and edges",sizes)
        assert context and any(n>0 and e>0 for _,n,e in sizes),"graph extraction did not create a usable graph"
        pathlib.Path("lightrag-result.json").write_text(json.dumps({"graph_sizes":sizes,"context":str(context)},ensure_ascii=False,indent=2))
        print("Experimental graph build passed; extracted edges require doctrinal review")
    finally:
        await rag.finalize_storages()
try:asyncio.run(main())
finally:
    proc.terminate()
    try:proc.wait(timeout=10)
    except Exception:proc.kill()
    log.close()
    print(pathlib.Path("/tmp/sutta-graph-model.log").read_text(errors="replace")[-1500:])
