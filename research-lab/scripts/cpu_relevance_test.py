import urllib.request, urllib.parse, json
from huggingface_hub import hf_hub_download
from llama_cpp import Llama
from sentence_transformers import SentenceTransformer, CrossEncoder
BASE="https://tipitaka.lk/api/q/"
def get(name,**kwargs):
    return json.load(urllib.request.urlopen(BASE+name+"?"+urllib.parse.urlencode(kwargs),timeout=20))
keys=["sn-2-1-7-1","mn-1-1-10","mn-1-2-10","an-1-1-1","an-1-1-2","an-1-1-3","sn-2-3-1-6"]
docs=[]
for k in keys:
    n=get("tree.node",key=k)[0]
    rows=get("text.entries",file=n["file"],**{"from":n["page_idx"],"to":min(n["page_idx"]+2,n["page_count"]-1)})
    text=" ".join(x["s_text"] for x in rows if x.get("node_key")==k and x.get("s_text"))
    assert text
    docs.append((k,n["sinh"],text[:1400]))
question="සිත ගැන විස්තර කියන්න"
embed=SentenceTransformer("BAAI/bge-m3",revision="5617a9f61b028005a4858fdac845db406aefb181",device="cpu")
vectors=embed.encode([question]+[x[1]+" "+x[2] for x in docs],normalize_embeddings=True)
scores=vectors[1:]@vectors[0]
print("Embedding ranking",sorted(zip(keys,scores.tolist()),key=lambda x:-x[1]))
rerank=CrossEncoder("BAAI/bge-reranker-v2-m3",revision="953dc6f6f85a1b2dbfca4c34a2796e7dde08d41e",device="cpu",max_length=512)
scores=rerank.predict([(question,x[1]+" "+x[2]) for x in docs])
ranked=sorted(zip(docs,scores.tolist()),key=lambda x:-x[1])
print("Reranker ranking",[(x[0][0],x[1]) for x in ranked])
selected=[x[0] for x in ranked[:3]]
del embed,rerank
path=hf_hub_download("Qwen/Qwen3-8B-GGUF","Qwen3-8B-Q4_K_M.gguf",revision="7c41481f57cb95916b40956ab2f0b139b296d974")
llm=Llama(model_path=path,n_ctx=8192,n_threads=2,n_gpu_layers=0,verbose=False)
evidence="\n".join(f"[S{i+1}] {x[1]} {x[2][:650]}" for i,x in enumerate(selected))
prompt=f"පහත මූලාශ්‍ර අනුව සිංහලෙන් පමණක් පිළිතුරු දෙන්න. අදාළ නැති පාඨ නොගන්න. [S1] වැනි සබැඳි අංක යොදන්න. ප්‍රශ්නය: {question}\n{evidence}\n/no_think"
# Explicitly prefill a closed thinking block; do not spend the answer budget on reasoning traces.
chat="<|im_start|>system\nYou are a careful Buddhist textual research assistant. Use only supplied evidence. Answer in Sinhala with inline [S1], [S2], [S3] references.<|im_end|>\n<|im_start|>user\n"+prompt+"<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n"
assert len(llm.tokenize(chat.encode("utf-8"),special=True))+1200<8192
out=llm(chat,max_tokens=1200,temperature=0.1,stop=["<|im_end|>","<|endoftext|>"])["choices"][0]["text"]
import re
out=re.sub(r"<think>.*?</think>","",out,flags=re.S).strip()
assert "<think>" not in out,"unfinished reasoning"
print("CPU grounded draft:",out)
print("Relevant-source top 3:",sum(x[0] in keys[:3] for x in selected),"/3")
assert out and any("\u0d80"<=c<="\u0dff" for c in out)
import re
refs=re.findall(r"\[S(\d+)\]",out)
assert refs and all(1<=int(x)<=3 for x in refs),"missing or invalid citations"
assert sum(x[0] in keys[:3] for x in selected)>=2,"relevance gate failed"
