"""Publish only new isolated, explicit free-hardware spaces. No paid fallback."""
import os
from pathlib import Path
from huggingface_hub import HfApi
api=HfApi(token=os.environ["HF_TOKEN"])
key=os.environ["SUTTA_SPACE_KEY"]
assert key
assert api.whoami()["name"]=="gkasun"
root=Path(__file__).resolve().parents[1]
success=0
for name,folder,hardware in [("suttago-grounding-lab","hf-grounding-space","cpu-basic"),("suttago-gemma31-research-lab","hf-gemma31-space","zero-a10g")]:
    repo="gkasun/"+name
    try:
        if api.repo_exists(repo,repo_type="space"):
            print("Already exists; not replacing:",repo)
            continue
        api.create_repo(repo_id=repo,repo_type="space",space_sdk="gradio",space_hardware=hardware,exist_ok=False,private=False)
        api.add_space_secret(repo,"SUTTA_SPACE_KEY",key)
        api.upload_folder(repo_id=repo,repo_type="space",folder_path=str(root/folder),ignore_patterns=["__pycache__/*","*.pyc"])
        print("Published:", "https://huggingface.co/spaces/"+repo,hardware)
        success+=1
    except Exception as e:
        print("Unable to publish:",repo,type(e).__name__,getattr(getattr(e,"response",None),"status_code",""))
        # No automatic upgrade or retry.
assert success>0,"No new free Space was published"
