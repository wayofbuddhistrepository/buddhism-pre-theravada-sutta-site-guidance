"""Update only the existing Qwen Space, retaining its model and hardware."""
import os
from pathlib import Path
from huggingface_hub import HfApi,CommitOperationAdd
api=HfApi(token=os.environ["HF_TOKEN"])
assert api.whoami()["name"]=="gkasun"
repo="gkasun/suttago-reasoning-lab"
info=api.space_info(repo)
assert info.sha=="3c177fce17a082c74d5f21329b4901a42942436e","Space changed; stop instead of overwriting"
rt=api.get_space_runtime(repo)
assert getattr(rt.hardware,"value",rt.hardware)=="zero-a10g"
root=Path(__file__).resolve().parents[1]/"hf-space"
api.create_commit(repo_id=repo,repo_type="space",parent_commit=info.sha,
    operations=[CommitOperationAdd(path_in_repo=f,path_or_fileobj=str(root/f)) for f in ("app.py","requirements.txt","cpu_image.py")],
    commit_message="Add authenticated CPU-only background endpoint; keep Qwen fallback")
print("Updated existing Space; hardware unchanged.")
