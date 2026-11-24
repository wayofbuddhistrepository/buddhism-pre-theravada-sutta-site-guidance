"""Bounded CPU model comparison; test images only, no paid inference."""
import os, argparse, time, json, subprocess, shutil, urllib.request
from pathlib import Path
from PIL import Image, ImageStat
from huggingface_hub import hf_hub_download
p=argparse.ArgumentParser()
p.add_argument("engine",choices=["sana","flux","sdxl","upscale","sdxs"])
a=p.parse_args()
out=Path("advanced-poster-output");out.mkdir(exist_ok=True)
prompt="Exquisite hand painted anime landscape, tranquil Sri Lankan forest monastery beside a still lotus lake, soft golden dawn, mossy rocks, lush foliage, delicate pink flowers, atmospheric mist, detailed reflections, peaceful, no people, no text"
start=time.monotonic()
if a.engine=="flux":
    repo="manishdashsharma/flux2-klein-4b-gguf";rev="37899b123f28719962abcbd2a259eef6fd28c787"
    files=[hf_hub_download(repo,f,revision=rev) for f in ["flux-2-klein-4b-q4_0.gguf","Qwen3-4B-Q4_K_S.gguf","flux2-vae.safetensors"]]
    cli=os.environ["SD_CLI"];loaded=time.monotonic()
    subprocess.run([cli,"--diffusion-model",files[0],"--llm",files[1],"--vae",files[2],"-p",prompt,"--cfg-scale","1.0","--steps","4","-W","512","-H","512","-t","4","--seed","5720","--offload-to-cpu","-o",str(out/"flux.png")],check=True,timeout=1200)
    image=Image.open(out/"flux.png")
elif a.engine=="upscale":
    import torch, cv2, numpy as np
    # basicsr 1.4.2 expects the historical torchvision module name.
    import sys
    import torchvision.transforms.functional as F
    sys.modules.setdefault("torchvision.transforms.functional_tensor",F)
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer
    torch.set_num_threads(4)
    repo="xinntao/Real-ESRGAN";rev="v0.2.2.4"
    weights=Path("/tmp/RealESRGAN_x4plus_anime_6B.pth")
    urllib.request.urlretrieve("https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth",weights)
    # Use a deterministic synthetic colored landscape test image, not an AI generation claim.
    from PIL import ImageDraw
    sample=Image.new("RGB",(256,256),"#b1d5c6");d=ImageDraw.Draw(sample)
    d.polygon([(0,130),(80,40),(150,160),(210,60),(256,140),(256,256),(0,256)],fill="#426d62")
    d.ellipse((25,20,65,60),fill="#ffe1a0")
    d.rectangle((0,185,256,256),fill="#83b3ac")
    d.ellipse((50,198,100,224),fill="#e7a4b5")
    sample.save(out/"upscale-input.png")
    m=RRDBNet(num_in_ch=3,num_out_ch=3,num_feat=64,num_block=6,num_grow_ch=32,scale=4)
    up=RealESRGANer(scale=4,model_path=str(weights),model=m,tile=128,tile_pad=10,half=False,device=torch.device("cpu"))
    loaded=time.monotonic()
    rgb=cv2.cvtColor(np.array(sample),cv2.COLOR_RGB2BGR)
    result,_=up.enhance(rgb,outscale=4)
    image=Image.fromarray(cv2.cvtColor(result,cv2.COLOR_BGR2RGB))
    assert image.size==(1024,1024)
else:
    import torch
    torch.set_num_threads(4)
    dtype=torch.bfloat16
    if a.engine=="sana":
        from diffusers import SanaSprintPipeline
        repo="Efficient-Large-Model/Sana_Sprint_0.6B_1024px_diffusers";rev="aa76e7f4f4928f378716b6716a2130fba3caf5b1"
        pipe=SanaSprintPipeline.from_pretrained(repo,revision=rev,torch_dtype=dtype).to("cpu")
        loaded=time.monotonic()
        with torch.inference_mode(): image=pipe(prompt=prompt,height=768,width=768,num_inference_steps=2,generator=torch.Generator("cpu").manual_seed(5720)).images[0]
    elif a.engine=="sdxl":
        from diffusers import StableDiffusionXLPipeline, UNet2DConditionModel, EulerDiscreteScheduler
        from safetensors.torch import load_file
        repo="ByteDance/SDXL-Lightning";rev="c9a24f48e1c025556787b0c58dd67a091ece2e44"
        base="stabilityai/stable-diffusion-xl-base-1.0";br="462165984030d82259a11f4367a4eed129e94a7b"
        unet=UNet2DConditionModel.from_config(UNet2DConditionModel.load_config(base,subfolder="unet",revision=br)).to(dtype=dtype)
        unet.load_state_dict(load_file(hf_hub_download(repo,"sdxl_lightning_4step_unet.safetensors",revision=rev)))
        pipe=StableDiffusionXLPipeline.from_pretrained(base,revision=br,unet=unet,torch_dtype=dtype,variant="fp16",use_safetensors=True).to("cpu")
        pipe.scheduler=EulerDiscreteScheduler.from_config(pipe.scheduler.config,timestep_spacing="trailing")
        pipe.enable_vae_slicing();pipe.enable_vae_tiling();loaded=time.monotonic()
        with torch.inference_mode(): image=pipe(prompt,height=768,width=768,num_inference_steps=4,guidance_scale=0,generator=torch.Generator("cpu").manual_seed(5720)).images[0]
    else:
        from diffusers import StableDiffusionPipeline
        repo="IDKiro/sdxs-512-dreamshaper";rev="76f720262bb051da75666b22c902a78c8e16c763"
        pipe=StableDiffusionPipeline.from_pretrained(repo,revision=rev,torch_dtype=torch.float32).to("cpu")
        loaded=time.monotonic()
        with torch.inference_mode(): image=pipe(prompt,height=512,width=512,num_inference_steps=1,guidance_scale=0,generator=torch.Generator("cpu").manual_seed(5720)).images[0]
image=image.convert("RGB")
assert min(image.size)>=512 and max(ImageStat.Stat(image).stddev)>10
image.save(out/(a.engine+".jpg"),quality=94)
meta={"model":repo,"revision":rev,"engine":a.engine,"size":image.size,"load_seconds":round(loaded-start,2),"generation_seconds":round(time.monotonic()-loaded,2),"compute":"CPU","prompt":prompt if a.engine!="upscale" else None}
(out/(a.engine+".json")).write_text(json.dumps(meta,indent=2));print(meta,flush=True)
