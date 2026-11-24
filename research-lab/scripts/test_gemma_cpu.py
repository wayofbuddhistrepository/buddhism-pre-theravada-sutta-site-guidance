import json, os, subprocess, time, urllib.request, re
from pathlib import Path
from huggingface_hub import hf_hub_download
repo,revision,filename=os.environ["MODEL_REPO"],os.environ["MODEL_REV"],os.environ["MODEL_FILE"]
model=hf_hub_download(repo,filename,revision=revision)
exe=next(Path("/tmp/sutta-llama").rglob("llama-server"))
proc=subprocess.Popen([str(exe),"-m",model,"-ngl","0","-c","4096","-t","4","--host","127.0.0.1","--port","18391","--parallel","1"],stdout=open("/tmp/sutta-model.log","w"),stderr=subprocess.STDOUT)
try:
    for i in range(120):
        if proc.poll() is not None: raise RuntimeError("model startup failed")
        try:
            if urllib.request.urlopen("http://127.0.0.1:18391/health",timeout=2).status==200:break
        except Exception:time.sleep(2)
    else:raise RuntimeError("startup timeout")
    evidence=[]
    for id,path in [("sn12.61","sn/sn12"),("mn10","mn"),("mn20","mn")]:
        u=f"https://raw.githubusercontent.com/suttacentral/bilara-data/published/translation/en/sujato/sutta/{path}/{id}_translation-en-sujato.json"
        d=json.load(urllib.request.urlopen(u,timeout=20))
        terms={"sn12.61":("monkey","mind","consciousness"),"mn10":("mind with","mind without"),"mn20":("unskillful","thoughts")}
        lines=[v for v in d.values() if any(w in v.lower() for w in terms[id])]
        evidence.append({"ref":f"S{len(evidence)+1}","id":id,"text":" ".join(lines)[:1000]})
    assert all(x["text"] for x in evidence)
    body={"messages":[{"role":"user","content":"Answer in natural Sinhala only. Explain the changing nature of the mind and how to cultivate it using only this evidence. Cite every main claim with [S1], [S2], [S3]. Do not output reasoning traces. Question: සිතේ ස්වභාවය හා සිත දියුණු කිරීම ගැන කියන්න. Evidence: "+json.dumps(evidence,ensure_ascii=False)}],"max_tokens":850,"temperature":0.1}
    req=urllib.request.Request("http://127.0.0.1:18391/v1/chat/completions",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
    answer=json.load(urllib.request.urlopen(req,timeout=480))["choices"][0]["message"]["content"] or ""
    print("MODEL",repo,"CPU draft:",answer)
    refs=set(re.findall(r"\[S([123])\]",answer))
    letters=[x for x in answer if x.isalpha()]
    si=sum("\u0d80"<=x<="\u0dff" for x in letters)
    assert len(answer)>100 and len(refs)>=2 and si/max(1,len(letters))>.6,"basic language/citation gate failed"
    print("Basic format gate passed; doctrinal quality requires human review")
finally:
    proc.terminate()
    try:proc.wait(timeout=10)
    except Exception:proc.kill()
    print(Path("/tmp/sutta-model.log").read_text(errors="replace")[-4000:])
