import os, re, hmac, json, threading, urllib.request, urllib.parse, urllib.robotparser
from functools import lru_cache
import gradio as gr
import numpy as np
import torch
from sentence_transformers import SentenceTransformer, CrossEncoder
from scrapy.http import HtmlResponse
import trafilatura

KEY=os.environ.get("SUTTA_SPACE_KEY","")
torch.set_num_threads(2)
lock=threading.Lock()
embedder=reranker=None

def auth(key):
    if not KEY or not hmac.compare_digest(str(key),KEY):
        raise gr.Error("Access denied")

def rank(payload,key):
    auth(key)
    if not isinstance(payload,str) or len(payload)>45000:
        raise gr.Error("Request too large")
    d=json.loads(payload)
    q=d.get("question","");docs=d.get("passages",[])
    if not isinstance(q,str) or not 0<len(q)<=500 or not isinstance(docs,list) or not 1<=len(docs)<=14:
        raise gr.Error("Invalid candidates")
    if any(not isinstance(x,str) or not 0<len(x)<=2600 for x in docs):
        raise gr.Error("Invalid passage")
    global embedder,reranker
    with lock,torch.inference_mode():
        if embedder is None:
            embedder=SentenceTransformer("BAAI/bge-m3",revision="5617a9f61b028005a4858fdac845db406aefb181",device="cpu",trust_remote_code=False)
            embedder.max_seq_length=512
        if reranker is None:
            reranker=CrossEncoder("BAAI/bge-reranker-v2-m3",revision="953dc6f6f85a1b2dbfca4c34a2796e7dde08d41e",device="cpu",max_length=512,trust_remote_code=False)
        v=embedder.encode([q]+docs,normalize_embeddings=True,batch_size=4,show_progress_bar=False)
        dense=np.asarray(v[1:]@v[0],dtype=float)
        cross=np.asarray(reranker.predict([(q,t) for t in docs],batch_size=4,show_progress_bar=False),dtype=float).reshape(-1)
    if len(cross)!=len(docs) or not np.isfinite(cross).all() or not np.isfinite(dense).all():
        raise gr.Error("Invalid ranking")
    dorder=np.argsort(-dense);corder=np.argsort(-cross)
    dr={int(i):k for k,i in enumerate(dorder)};cr={int(i):k for k,i in enumerate(corder)}
    ranked=sorted(range(len(docs)),key=lambda i: -(1/(60+dr[i])+2/(60+cr[i])))
    return json.dumps({"indices":ranked,"dense":dense.tolist(),"cross":cross.tolist(),"model":"bge-m3+bge-reranker-v2-m3"})

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        return None
opener=urllib.request.build_opener(NoRedirect())
agent="SuttaGoResearchLab"
host="https://www.dhammatalks.org"
@lru_cache(maxsize=1)
def robots():
    with opener.open(urllib.request.Request(host+"/robots.txt",headers={"User-Agent":agent}),timeout=7) as r:
        body=r.read(100000).decode("utf8","replace")
    rp=urllib.robotparser.RobotFileParser(host+"/robots.txt")
    rp.parse(body.splitlines())
    return rp

def extract(url,key):
    auth(key)
    if not isinstance(url,str) or not re.fullmatch(r"https://www\.dhammatalks\.org/suttas/(?:DN|MN|SN|AN|KN)/[A-Za-z0-9_.-]+\.html",url):
        raise gr.Error("Only fixed canonical Sutta URLs are supported")
    if not robots().can_fetch(agent,url):
        raise gr.Error("Robots policy does not permit this retrieval")
    with opener.open(urllib.request.Request(url,headers={"User-Agent":agent}),timeout=10) as r:
        raw=r.read(1000001)
    if len(raw)>1000000:raise gr.Error("Source exceeds size limit")
    page=HtmlResponse(url=url,body=raw,encoding="utf-8")
    paragraphs=[" ".join(p.css("::text").getall()).strip() for p in page.css("main p")]
    body=trafilatura.extract(raw,include_comments=False,include_tables=False)
    # Keep source wording; never rewrite it into model-generated content.
    return json.dumps({"url":url,"paragraphs":[x for x in paragraphs if x][:100],"extracted":(body or "")[:20000]},ensure_ascii=False)

with gr.Blocks(title="SuttaGo grounded evidence") as app:
    gr.Markdown("## Experimental source ranking and extraction")
    q=gr.Textbox(label="Candidate JSON")
    k=gr.Textbox(type="password",label="Access key")
    out=gr.Textbox(label="Ranked candidate indices")
    gr.Button("Rank").click(rank,[q,k],out,api_name="rank",concurrency_limit=1)
    u=gr.Textbox(label="Permitted Sutta URL")
    ex=gr.Textbox(label="Extracted text")
    gr.Button("Extract").click(extract,[u,k],ex,api_name="extract",concurrency_limit=1)
app.queue(max_size=3).launch()
