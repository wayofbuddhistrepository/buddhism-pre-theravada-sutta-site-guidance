"""Live website regression checks; evidence matches are not semantic correctness."""
import urllib.request,json,time,concurrent.futures
url="https://suttago-research-lab.vercel.app/api/ask"
cases=[
 ("සිතේ ගැඹුර ගැන කියන්න","si","deep",["bjt:sn-2-1-7-1","bjt:mn-1-1-10"],False),
 ("චිත්තභාවනා සහ චිත්තානුපස්සනා අතර වෙනස","si","deep",[],False),
 ("පටිච්චසමුප්පාදය ගැන විස්තර කරන්න","si","deep",[],False),
 ("What is dependent origination?","en","quick",["sn12.1","sn12.20"],False),
 ("MN 118","en","quick",["mn118"],False),
 ("xyznonexistenttoken","en","quick",[],True)]
def check(item):
    q,l,m,want,empty=item
    t=time.monotonic()
    try:
        req=urllib.request.Request(url,data=json.dumps({"q":q,"lang":l,"mode":m}).encode(),headers={"Content-Type":"application/json"})
        d=json.load(urllib.request.urlopen(req,timeout=75))
        ids=[s["id"] for s in d.get("sources",[])]
        return {"q":q,"seconds":round(time.monotonic()-t,1),"ids":ids,"model":d.get("research",{}).get("model"),"grounding":d.get("grounding"),"answer":d.get("answer"),"pass":not ids if empty else bool(ids) and all(x in ids for x in want)}
    except Exception as e:return {"q":q,"error":str(e),"pass":False}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:rows=list(ex.map(check,cases))
for r in rows:print(json.dumps(r,ensure_ascii=False))
open("live-regression.json","w").write(json.dumps(rows,ensure_ascii=False,indent=2))
assert all(r["pass"] for r in rows)
