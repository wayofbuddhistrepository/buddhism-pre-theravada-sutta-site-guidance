"""One bounded anonymous inference evaluation per deployed Space. Never print credentials."""
import os, re, json, time, urllib.request, urllib.parse
key=os.environ["SUTTA_SPACE_KEY"]
assert key
def get_json(url, timeout=12, data=None):
    req=urllib.request.Request(url,data=None if data is None else json.dumps(data,ensure_ascii=False).encode(),headers={"Content-Type":"application/json","User-Agent":"SuttaGo research smoke"})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return json.load(r)
def bjt(name,params):
    return get_json("https://tipitaka.lk/api/q/"+name+"?"+urllib.parse.urlencode(params))
evidence=[]
for uid,title in [("sn-2-1-7-1","SN 12.61"),("mn-1-1-10","MN 10"),("mn-1-2-10","MN 20")]:
    node=bjt("tree.node",{"key":uid})[0]
    assert node["key"]==uid and node["collection"]=="mula"
    rows=bjt("text.entries",{"file":node["file"],"from":node["page_idx"],"to":min(node["page_idx"]+2,node["page_count"]-1)})
    lines=[r["s_text"] for r in rows if r.get("node_key")==uid and isinstance(r.get("s_text"),str) and len(r["s_text"])>45]
    matches=[s for s in lines if any(t in s for t in ["සිත","මනස","විඤ්ඤාණ","විතක්ක"])]
    assert matches,uid
    evidence.append({"id":title,"ref":f"S{len(evidence)+1}","text":"\n".join(matches)[:1600]})
prompt="සිංහලෙන් පමණක් කෙටි නමුත් සාරවත් ධර්ම විග්‍රහයක් දෙන්න. ලබා දුන් පාඨවලට පමණක් පදනම් වන්න. ප්‍රශ්නය: සිත වෙනස් වන ස්වභාවය සහ සිත දියුණු කිරීම. සෑම ප්‍රධාන කරුණකටම [S1] ආකාරයේ මූලාශ්‍ර අංක දෙන්න. පාඨවල නැති කරුණු හෝ පාලි උපුටා දැක්වීම් නිර්මාණය නොකරන්න.\n"+json.dumps(evidence,ensure_ascii=False)
names=["suttago-reasoning-lab","suttago-gemma-research-lab"]
deadline=time.monotonic()+1050
pending=set(names); ready=[]; failed=[]
while pending and time.monotonic()<deadline:
    for name in list(pending):
        try:
            d=get_json("https://huggingface.co/api/spaces/gkasun/"+name)
            rt=d.get("runtime",{})
            stage=rt.get("stage")
            # Ignore prior runtime error until the repaired version is published.
            u="https://huggingface.co/spaces/gkasun/"+name+"/resolve/main/app.py"
            code=urllib.request.urlopen(u,timeout=10).read(100000).decode()
            if "@spaces.GPU(duration=45" not in code: continue
            print(name,stage,flush=True)
            if stage=="RUNNING":
                info=get_json("https://gkasun-"+name+".hf.space/gradio_api/info")
                if "/answer" in info.get("named_endpoints",{}):
                    ready.append(name);pending.remove(name)
            elif stage in {"BUILD_ERROR","RUNTIME_ERROR","CONFIG_ERROR"}:
                failed.append(name);pending.remove(name)
        except Exception as e:
            print(name,type(e).__name__,flush=True)
    if pending:time.sleep(30)
# Free anonymous GPU quota applies. No HF bearer token, no automatic paid quota or repeated requests.
passed=0
for name in ready:
    host="https://gkasun-"+name+".hf.space"
    try:
        r=get_json(host+"/gradio_api/call/answer",timeout=15,data={"data":[prompt,key]})
        ev=r.get("event_id","")
        assert re.fullmatch(r"[a-zA-Z0-9-]+",ev)
        with urllib.request.urlopen(host+"/gradio_api/call/answer/"+ev,timeout=140) as f:
            content=f.read(100000).decode()
        m=re.search(r"event:\s*complete\s*\ndata:\s*(\[[^\n]*\])",content)
        if not m:
            print(name,"No complete response (quota, queue or runtime error); no retries")
            continue
        ans=json.loads(m[1])[0]
        # Never log the raw model response if it unexpectedly repeats the access key.
        ans=str(ans).replace(key,"[REDACTED]")
        refs=[int(x) for x in re.findall(r"\[S(\d+)\]",ans)]
        letters=[x for x in ans if x.isalpha()]
        sinhala=sum("\u0d80"<=x<="\u0dff" for x in letters)
        ok=len(ans)>100 and len(set(refs))>=2 and all(1<=x<=3 for x in refs) and sinhala/max(1,len(letters))>.6
        print(name,"format gate",ok,"answer:",ans[:3000])
        if ok:passed+=1
    except Exception as e:
        print(name,type(e).__name__,"No retry")
print("Passed:",passed,"Ready:",ready,"Failed:",failed,"Not ready:",list(pending))
assert passed>0,"No model passed real inference evaluation"
