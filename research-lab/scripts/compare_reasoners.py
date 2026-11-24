"""Finite CPU benchmark using original Sinhala source passages. Format checks are not doctrinal approval."""
import os, json, re, time, urllib.request, urllib.parse, subprocess, pathlib
from huggingface_hub import hf_hub_download
def get(url,params=None):
    if params:url+="?"+urllib.parse.urlencode(params)
    return json.load(urllib.request.urlopen(url,timeout=20))
def evidence(key,term):
    base="https://tipitaka.lk/api/q/"
    n=get(base+"tree.node",{"key":key})[0]
    assert n["key"]==key and n["collection"]=="mula"
    rows=get(base+"text.entries",{"file":n["file"],"from":n["page_idx"],"to":min(n["page_idx"]+2,n["page_count"]-1)})
    lines=[r["s_text"] for r in rows if r.get("node_key")==key and r.get("s_text")]
    assert lines
    ranked=sorted(range(len(lines)),key=lambda i:(term in lines[i],len(lines[i])),reverse=True)
    i=ranked[0]
    return {"title":n["sinh"],"id":key,"text":" ".join(lines[max(0,i-1):i+2])[:900],"url":"https://tipitaka.lk/"+key+"/sinh"}
cases=[
 ("mind","සිතෙහි අනිත්‍ය ස්වභාවය හා සිත දියුණු කිරීම සූත්‍ර ඇසුරින් පැහැදිලි කරන්න.",[("sn-2-1-7-1","සිත"),("mn-1-1-10","සිත"),("mn-1-2-10","සිත")]),
 ("origination","පටිච්චසමුප්පාදය හා හේතු ප්‍රත්‍යය අනුව හටගන්නා ධර්ම අතර සම්බන්ධය පැහැදිලි කරන්න.",[("sn-2-1-1-1","පටිච්ච"),("sn-2-1-2-10","පච්ච")])
]
repo=os.environ["MODEL_REPO"]
model=hf_hub_download(repo,os.environ["MODEL_FILE"],revision=os.environ["MODEL_REV"])
exe=next(pathlib.Path("/tmp/sutta-llama").rglob("llama-server"))
log=open("/tmp/sutta-reasoner.log","w")
proc=subprocess.Popen([str(exe),"-m",model,"-ngl","0","-c","8192","-t","4","--reasoning-budget","128","--host","127.0.0.1","--port","18391","--parallel","1"],stdout=log,stderr=subprocess.STDOUT)
report=[]
try:
    for i in range(180):
        if proc.poll() is not None:raise RuntimeError("model exited during load")
        try:
            if urllib.request.urlopen("http://127.0.0.1:18391/health",timeout=2).status==200:break
        except Exception:time.sleep(2)
    else:raise RuntimeError("model health timeout")
    for label,q,keys in cases:
        try:
            docs=[evidence(k,t) for k,t in keys]
            for i,d in enumerate(docs):d["ref"]="S"+str(i+1)
            prompt="සිංහලෙන් පමණක් පිළිතුරු දෙන්න. මුල් මූලාශ්‍රවලින් තහවුරු වන කරුණු පමණක් [S1] වැනි යොමු සමඟ පැහැදිලි කරන්න. සිත, මනස, විඤ්ඤාණය සහ සඤ්ඤාව පටලවා නොගන්න. පාඨය ප්‍රමාණවත් නැත්නම් එය සඳහන් කරන්න. Use standard Theravada terminology, no reasoning trace. "+json.dumps({"question":q,"evidence":docs},ensure_ascii=False)
            body={"messages":[{"role":"user","content":prompt}],"max_tokens":1100,"temperature":0.1,"chat_template_kwargs":{"enable_thinking":False}}
            req=urllib.request.Request("http://127.0.0.1:18391/v1/chat/completions",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
            start=time.monotonic()
            j=json.load(urllib.request.urlopen(req,timeout=650))
            c=j["choices"][0];ans=c["message"].get("content") or ""
            refs=[int(x) for x in re.findall(r"\[S(\d+)\]",ans)]
            letters=[x for x in ans if x.isalpha()]
            si=sum("\u0d80"<=x<="\u0dff" for x in letters)/max(1,len(letters))
            passed=len(ans)>100 and si>.6 and len(set(refs))>=2 and all(1<=i<=len(docs) for i in refs) and c.get("finish_reason")!="length"
            row={"case":label,"question":q,"source_ids":[d["id"] for d in docs],"answer":ans,"format_pass":passed,"seconds":round(time.monotonic()-start,1),"finish":c.get("finish_reason"),"refs":refs}
        except Exception as e:row={"case":label,"error":str(e),"format_pass":False}
        report.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
finally:
    proc.terminate()
    try:proc.wait(timeout=10)
    except Exception:proc.kill()
    log.close()
    pathlib.Path("benchmark-result.json").write_text(json.dumps({"model":repo,"results":report},ensure_ascii=False,indent=2))
    print(pathlib.Path("/tmp/sutta-reasoner.log").read_text(errors="replace")[-2200:])
assert len(report)==len(cases) and all(x["format_pass"] for x in report),"one or more cases failed basic gate"
