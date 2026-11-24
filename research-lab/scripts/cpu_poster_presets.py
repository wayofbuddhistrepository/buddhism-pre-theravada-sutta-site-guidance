"""Create diverse public background presets, not a public inference service."""
import json,time
from pathlib import Path
import torch
from diffusers import StableDiffusionPipeline
from PIL import ImageStat
torch.set_num_threads(4)
repo="IDKiro/sdxs-512-dreamshaper"
rev="76f720262bb051da75666b22c902a78c8e16c763"
pipe=StableDiffusionPipeline.from_pretrained(repo,revision=rev,torch_dtype=torch.float32).to("cpu")
out=Path("poster-presets");out.mkdir(exist_ok=True)
scenes={
"lotus":"serene lotus pond, pink lotus flowers, ancient Buddhist forest monastery, wooden bridge",
"lake":"calm mountain lake, distant blue hills, water reflections, soft morning mist",
"forest":"deep tranquil green forest, winding mossy stone path, tall trees, sunlight shafts",
"waterfall":"beautiful waterfall in tropical forest, mossy stones, clear pool",
"night":"moonlit mountain landscape, still lake, serene blue evening, stars",
"temple":"peaceful Sri Lankan ancient Buddhist stupa, monastery garden, golden dawn"
}
manifest=[]
for i,(scene,prompt) in enumerate(scenes.items()):
 for j in range(3):
  seed=5720+i*101+j*31
  start=time.monotonic()
  with torch.inference_mode(): image=pipe("Detailed hand painted anime landscape, "+prompt+", peaceful contemplative atmosphere, no people, no text",height=512,width=512,num_inference_steps=1,guidance_scale=0,generator=torch.Generator("cpu").manual_seed(seed)).images[0].convert("RGB")
  if max(ImageStat.Stat(image).stddev)<10:continue
  name=f"{scene}-{j}.jpg";image.save(out/name,quality=94)
  manifest.append({"scene":scene,"file":name,"model":repo,"seed":seed,"seconds":round(time.monotonic()-start,2)})
  print(manifest[-1],flush=True)
assert len(manifest)>=12
(out/"manifest.json").write_text(json.dumps(manifest))
