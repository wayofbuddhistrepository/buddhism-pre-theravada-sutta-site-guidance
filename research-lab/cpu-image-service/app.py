"""Authenticated CPU-only SDXS service. No GPU, queue, or external inference API."""
import os, io, hmac, secrets, threading, time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field
import torch
from diffusers import StableDiffusionPipeline
from PIL import ImageStat

MODEL="IDKiro/sdxs-512-dreamshaper"
REV="76f720262bb051da75666b22c902a78c8e16c763"
KEY=os.environ.get("SUTTA_CPU_IMAGE_KEY","")
if len(KEY)<24:
    raise RuntimeError("Set a random SUTTA_CPU_IMAGE_KEY of at least 24 characters")
torch.set_num_threads(max(1,min(4,int(os.environ.get("CPU_THREADS","2")))))
torch.set_num_interop_threads(1)
pipe=None
gate=threading.Lock()
@asynccontextmanager
async def lifespan(app):
    global pipe
    pipe=StableDiffusionPipeline.from_pretrained(MODEL,revision=REV,torch_dtype=torch.float32,trust_remote_code=False).to("cpu")
    yield
    pipe=None

app=FastAPI(lifespan=lifespan,docs_url=None,redoc_url=None,openapi_url=None)
class Request(BaseModel):
    prompt:str=Field(min_length=3,max_length=350)
    seed:int|None=Field(default=None,ge=0,le=4294967295)

@app.get("/health")
def health():
    return {"ready":pipe is not None,"device":"cpu","model":MODEL}
@app.post("/generate")
def generate(req:Request,authorization:str=Header(default="")):
    if not hmac.compare_digest(authorization,"Bearer "+KEY):
        raise HTTPException(401,"Unauthorized")
    prompt=req.prompt.strip()
    if len(prompt)<3: raise HTTPException(400,"Invalid prompt")
    if pipe is None: raise HTTPException(503,"Model unavailable")
    if not gate.acquire(blocking=False):raise HTTPException(503,"CPU busy; try later")
    try:
        seed=req.seed if req.seed is not None else secrets.randbits(32)
        start=time.monotonic()
        with torch.inference_mode():
            result=pipe(prompt=prompt+", peaceful detailed anime illustration, no lettering",
                height=512,width=512,num_inference_steps=1,guidance_scale=0,
                generator=torch.Generator("cpu").manual_seed(seed))
        if result.nsfw_content_detected and any(result.nsfw_content_detected):
            raise HTTPException(422,"Image filtered")
        im=result.images[0].convert("RGB")
        if im.size!=(512,512) or max(ImageStat.Stat(im).stddev)<10:
            raise HTTPException(502,"Invalid generated image")
        buf=io.BytesIO();im.save(buf,format="JPEG",quality=94)
        return Response(buf.getvalue(),media_type="image/jpeg",headers={"Cache-Control":"no-store","X-Image-Seed":str(seed),"X-Compute":"cpu","X-Inference-Seconds":str(round(time.monotonic()-start,2))})
    finally:
        gate.release()
