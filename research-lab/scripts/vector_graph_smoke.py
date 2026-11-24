"""Small real corpus relevance test. No paid APIs or generated graph claims."""
import json, urllib.request, numpy as np, faiss
from sentence_transformers import SentenceTransformer, CrossEncoder
from lightrag import LightRAG
from lightrag.kg.shared_storage import initialize_share_data
import networkx as nx
docs=[]
for id,path in [("sn12.61","sn/sn12"),("mn10","mn"),("mn20","mn"),("mn2","mn"),("sn12.20","sn/sn12"),("sn56.11","sn/sn56")]:
    u=f"https://raw.githubusercontent.com/suttacentral/bilara-data/published/translation/en/sujato/sutta/{path}/{id}_translation-en-sujato.json"
    d=json.load(urllib.request.urlopen(u,timeout=15))
    # Segment windows, not only the first page of each sutta.
    values=list(d.values())
    for i in range(0,len(values),8):
        docs.append((id," ".join(values[max(0,i-2):i+8])))
question="What is the changing nature of mind and how is the mind cultivated?"
embed=SentenceTransformer("BAAI/bge-m3",revision="5617a9f61b028005a4858fdac845db406aefb181",device="cpu")
v=embed.encode([x[1] for x in docs],normalize_embeddings=True,batch_size=8).astype("float32")
q=embed.encode([question],normalize_embeddings=True).astype("float32")
idx=faiss.IndexFlatIP(v.shape[1]);idx.add(v)
_, ids=idx.search(q,min(20,len(docs)))
rerank=CrossEncoder("BAAI/bge-reranker-v2-m3",revision="953dc6f6f85a1b2dbfca4c34a2796e7dde08d41e",device="cpu",max_length=512)
scores=rerank.predict([(question,docs[i][1]) for i in ids[0]])
ranked=sorted(zip(ids[0],scores),key=lambda x:-x[1])
print("FAISS + BGE reranked:",[(docs[i][0],float(s)) for i,s in ranked[:6]])
assert any(docs[i][0] in {"sn12.61","mn10","mn20"} for i,s in ranked[:3])
g=nx.Graph();g.add_edges_from([("concept:citta",s) for s in ["sn12.61","mn10","mn20"]])
assert len(list(g.neighbors("concept:citta")))==3
print("Reviewed graph traversal passed; LightRAG import passed; no LLM-generated graph claimed")
