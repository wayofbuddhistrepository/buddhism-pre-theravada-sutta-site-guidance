#!/usr/bin/env bash
set -euo pipefail
export OMP_NUM_THREADS=1
mkdir -p /tmp/suttago-native
cd /tmp/suttago-native
curl -fLsS --retry 2 --max-time 180 'https://huggingface.co/concedo/sdxs-512-tinySDdistilled-GGUF/resolve/3144d898d61492f8382ffcabec055733fc5b2a0e/sdxs-512-tinySDdistilled_Q8_0.gguf' -o model-q8.gguf
echo '409ab23582ee074c6b9d5395784fc0741b0599fb9d138686c69087c71678eb6a  model-q8.gguf' | sha256sum -c -
git clone --recurse-submodules https://github.com/leejet/stable-diffusion.cpp.git source
cd source
git checkout master-1127-79dc7ca
git submodule update --init --recursive
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=OFF -DSD_BUILD_EXAMPLES=ON
cmake --build build -j4
CLI=$(find build -type f -name sd-cli -executable | head -1)
test -n "$CLI"
CLI=$(realpath "$CLI")
cd ..
"$CLI" -M convert -m model-q8.gguf -o model-q4.gguf --type q4_0
ls -lh model-q4.gguf
# Benchmark actual images under a 2 GiB memory limit and one logical CPU.
# The runner can use privileged systemd scopes; disable swap to mirror serverless.
mkdir -p "$GITHUB_WORKSPACE/native-test"
for kind in lotus forest; do
 if [ "$kind" = lotus ]; then prompt='Beautiful anime lotus lake, morning sun, monastery, no lettering'; else prompt='Peaceful dense green forest, mossy trail, sunlight, no lettering'; fi
 output="$GITHUB_WORKSPACE/native-test/$kind.png"
 sudo systemd-run --quiet --scope -p MemoryMax=1900M -p MemorySwapMax=0 -p CPUQuota=100% \
   /usr/bin/time -v timeout 120 "$CLI" -m "$PWD/model-q4.gguf" -p "$prompt" --cfg-scale 1 --steps 1 -W 384 -H 384 -t 1 --seed 5720 -o "$output"
done
python - <<'PY'
from PIL import Image,ImageStat
import os,hashlib
a=[]
for name in ["lotus","forest"]:
 p=os.path.join(os.environ["GITHUB_WORKSPACE"],"native-test",name+".png")
 im=Image.open(p).convert("RGB");assert im.size==(384,384)
 assert max(ImageStat.Stat(im).stddev)>10
 a.append(hashlib.sha256(im.tobytes()).hexdigest())
assert a[0]!=a[1]
print("Two distinct prompt-driven neural CPU images passed constrained inference")
PY
sha256sum model-q4.gguf
stat -c '%s bytes' model-q4.gguf
