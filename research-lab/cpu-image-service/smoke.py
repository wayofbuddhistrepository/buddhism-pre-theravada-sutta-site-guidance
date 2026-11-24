import os,urllib.request,urllib.error,json,time,hashlib
from io import BytesIO
from PIL import Image
base="http://127.0.0.1:7860"
key=os.environ["SUTTA_CPU_IMAGE_KEY"]
deadline=time.monotonic()+300
while True:
    try:
        with urllib.request.urlopen(base+"/health",timeout=3) as r:
            assert json.load(r)["ready"];break
    except Exception:
        if time.monotonic()>deadline:raise
        time.sleep(3)
def image(prompt,key):
    req=urllib.request.Request(base+"/generate",data=json.dumps({"prompt":prompt,"seed":5720}).encode(),headers={"Content-Type":"application/json","Authorization":"Bearer "+key})
    with urllib.request.urlopen(req,timeout=120) as r:
        raw=r.read();assert r.headers["X-Compute"]=="cpu"
        im=Image.open(BytesIO(raw));assert im.size==(512,512)
        print("CPU seconds",r.headers["X-Inference-Seconds"],"bytes",len(raw),flush=True)
        return hashlib.sha256(im.tobytes()).hexdigest(),raw
try:
    image("lotus lake","wrong")
    raise AssertionError("unauthorized request accepted")
except urllib.error.HTTPError as e:
    assert e.code==401
a,raw=image("quiet lotus pond beside a monastery at sunrise",key)
open("cpu-lotus.jpg","wb").write(raw)
b,raw=image("dense rainforest waterfall under moonlight",key)
open("cpu-waterfall.jpg","wb").write(raw)
assert a!=b
print("PASS: two distinct prompt-driven CPU neural images and authentication")
