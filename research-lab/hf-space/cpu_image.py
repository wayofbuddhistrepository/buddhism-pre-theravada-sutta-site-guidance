"""CPU-only, authenticated image generation alongside the existing Qwen demo.
No GPU decorator, no paid APIs, no image persistence, no waiting queue.
"""
import base64, io, os, hmac, threading, time, collections
import gradio as gr

KEY=os.environ.get("SUTTA_SPACE_KEY","")
LOCK=threading.Lock()
RECENT=collections.deque()
PIPE=None
MODEL="IDKiro/sdxs-512-dreamshaper"
REV="76f720262bb051da75666b22c902a78c8e16c763"

def cpu_image(prompt,seed,key):
    if not KEY or not hmac.compare_digest(str(key),KEY):
        raise gr.Error("Access denied")
    if not isinstance(prompt,str) or not 3<=len(prompt.strip())<=350:
        raise gr.Error("Invalid prompt")
    if not isinstance(seed,(int,float)) or not 0<=seed<=4294967295:
        raise gr.Error("Invalid seed")
    if not LOCK.acquire(blocking=False):
        raise gr.Error("CPU busy; try again")
    try:
        now=time.monotonic()
        while RECENT and now-RECENT[0]>60: RECENT.popleft()
        if len(RECENT)>=6:raise gr.Error("CPU rate limit")
        RECENT.append(now)
        import torch
        from diffusers import StableDiffusionPipeline
        from diffusers.pipelines.stable_diffusion.safety_checker import StableDiffusionSafetyChecker
        from transformers import CLIPImageProcessor
        global PIPE
        if PIPE is None:
            # Use native CPU tensors; this endpoint does not allocate ZeroGPU.
            checker=StableDiffusionSafetyChecker.from_pretrained(
                "CompVis/stable-diffusion-safety-checker",trust_remote_code=False).to("cpu").eval()
            feature=CLIPImageProcessor.from_pretrained("CompVis/stable-diffusion-safety-checker")
            pipe=StableDiffusionPipeline.from_pretrained(MODEL,revision=REV,
                torch_dtype=torch.float32, safety_checker=checker,feature_extractor=feature,
                trust_remote_code=False).to("cpu")
            pipe.set_progress_bar_config(disable=True)
            PIPE=pipe
        if any(p.device.type!="cpu" for module in (PIPE.unet,PIPE.vae,PIPE.text_encoder) for p in module.parameters()):
            raise gr.Error("Non-CPU device; refused")
        start=time.monotonic()
        with torch.inference_mode():
            result=PIPE("Peaceful artistic anime illustration, "+prompt.strip()+", no lettering",
                width=512,height=512,num_inference_steps=1,guidance_scale=0,
                generator=torch.Generator(device="cpu").manual_seed(int(seed)))
        if result.nsfw_content_detected is None or any(result.nsfw_content_detected):
            raise gr.Error("Image safety check did not pass")
        im=result.images[0].convert("RGB")
        from PIL import ImageStat
        if max(ImageStat.Stat(im).stddev)<5:raise gr.Error("Invalid image")
        buf=io.BytesIO();im.save(buf,format="JPEG",quality=94)
        print("SDXS CPU generated: %.2fs"% (time.monotonic()-start),flush=True)
        return base64.b64encode(buf.getvalue()).decode("ascii")
    finally:
        LOCK.release()
