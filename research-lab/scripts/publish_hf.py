"""Run only after the owner configures a dedicated Hugging Face write token.
No credentials are logged. No paid hardware or automatic upgrade."""
import os
from pathlib import Path
from huggingface_hub import HfApi
token=os.environ["HF_TOKEN"]
key=os.environ["SUTTA_SPACE_KEY"]
api=HfApi(token=token)
owner=api.whoami()["name"]
repo=f"{owner}/suttago-reasoning-lab"
api.create_repo(repo_id=repo,repo_type="space",space_sdk="gradio",
    space_hardware="zero-a10g",exist_ok=True,private=False)
api.add_space_secret(repo,"SUTTA_SPACE_KEY",key)
api.upload_folder(repo_id=repo,repo_type="space",
    folder_path=str(Path(__file__).resolve().parents[1]/"hf-space"))
print("https://huggingface.co/spaces/"+repo)
