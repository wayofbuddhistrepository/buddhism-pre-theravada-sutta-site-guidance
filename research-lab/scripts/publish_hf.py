"""Owner-approved isolated spaces only. Never log credentials or select paid hardware."""
import os
from pathlib import Path
from huggingface_hub import HfApi
api=HfApi(token=os.environ["HF_TOKEN"])
key=os.environ["SUTTA_SPACE_KEY"]
assert len(key)>=16,"Use a strong SUTTA_SPACE_KEY (at least 16 characters)"
owner=api.whoami()["name"]
assert owner=="gkasun","Unexpected account; no changes made"
root=Path(__file__).resolve().parents[1]
for name,folder in [("suttago-reasoning-lab","hf-space"),("suttago-gemma-research-lab","hf-gemma-space")]:
    repo=f"{owner}/{name}"
    try:
        if api.repo_exists(repo,repo_type="space"):
            rt=api.get_space_runtime(repo)
            if getattr(rt.requested_hardware,"value",rt.requested_hardware)!="zero-a10g" and getattr(rt.hardware,"value",rt.hardware)!="zero-a10g":
                print("Skipped non-ZeroGPU Space:",repo)
                continue
            existing=api.space_info(repo)
            # Only touch the exact isolated project names, with matching SDK/title metadata.
            card=existing.card_data
            if not card or "SuttaGo" not in str(getattr(card,"title","")):
                print("Skipped unrecognized existing Space:",repo)
                continue
        else:
            api.create_repo(repo_id=repo,repo_type="space",space_sdk="gradio",space_hardware="zero-a10g",exist_ok=False,private=False)
        api.add_space_secret(repo,"SUTTA_SPACE_KEY",key)
        api.upload_folder(repo_id=repo,repo_type="space",folder_path=str(root/folder),ignore_patterns=["__pycache__/*","*.pyc"])
        print("Published:", "https://huggingface.co/spaces/"+repo)
    except Exception as e:
        print("Publish failed:",repo,type(e).__name__,getattr(getattr(e,"response",None),"status_code",""))
        if name=="suttago-reasoning-lab":
            raise RuntimeError("Primary Space update failed") from None
