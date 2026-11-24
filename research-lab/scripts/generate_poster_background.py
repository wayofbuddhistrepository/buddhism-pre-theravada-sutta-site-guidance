"""One-time CPU illustration experiments. No inference APIs or paid compute."""
import argparse, json, time, os
from pathlib import Path
from PIL import Image, ImageStat
p=argparse.ArgumentParser();p.add_argument("model",choices=["anime","openvino"]);a=p.parse_args()
out=Path("poster-output");out.mkdir(exist_ok=True)
prompt="Beautiful hand-painted anime landscape, peaceful ancient Buddhist forest monastery, Sri Lankan lotus pond, small stone bridge, golden sunrise filtering through lush trees, atmospheric mist, exquisite natural details, soft warm light, cinematic composition, no text, no lettering, no people"
start=time.monotonic()
if a.model=="anime":
    import torch
    from diffusers import StableDiffusionPipeline
    torch.set_num_threads(4)
    model="IDKiro/SDXS-512-DreamShaper-Anime";rev="2faf8a65496cf66f3927ec48ae0f2ba7dd943e39"
    pipe=StableDiffusionPipeline.from_pretrained(model,revision=rev,torch_dtype=torch.float32,trust_remote_code=False).to("cpu")
    loaded=time.monotonic()
    with torch.inference_mode():
        image=pipe(prompt,width=512,height=512,num_inference_steps=1,guidance_scale=0,generator=torch.Generator("cpu").manual_seed(5720)).images[0]
else:
    from optimum.intel.openvino import OVDiffusionPipeline
    model="OpenVINO/LCM_Dreamshaper_v7-int8-ov";rev="340a03e5488f36f7f222e6efa29819850ad7e4be"
    pipe=OVDiffusionPipeline.from_pretrained(model,revision=rev,device="CPU")
    loaded=time.monotonic()
    image=pipe(prompt,width=512,height=512,num_inference_steps=4).images[0]
assert isinstance(image,Image.Image)
image=image.convert("RGB")
assert min(image.size)>=512 and max(ImageStat.Stat(image).stddev)>10,"blank or invalid image"
image.save(out/(a.model+".jpg"),quality=95)
meta={"model":model,"revision":rev,"prompt":prompt,"size":image.size,"load_seconds":round(loaded-start,2),"generation_seconds":round(time.monotonic()-loaded,2),"compute":"CPU"}
(out/(a.model+".json")).write_text(json.dumps(meta,indent=2))
print(meta,flush=True)
