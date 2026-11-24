"""Publish only term hashes, document IDs and ranking statistics; no copied passage text.
Source: Tipitaka.lk/Pitaka.lk (CC BY-ND 4.0); SuttaCentral Bilara.
"""
import collections, gzip, hashlib, json, pathlib, sqlite3, sys, unicodedata
import regex
db=sqlite3.connect("file:"+str(pathlib.Path(sys.argv[1]).resolve())+"?mode=ro",uri=True)
out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
token_re=regex.compile(r"[\p{L}\p{M}\p{N}]+")
def tokens(s):
    s=unicodedata.normalize("NFC",s).replace("\u200d","").replace("\u200c","").lower()
    return [x for x in token_re.findall(s) if 3<=len(x)<=60 and not x.isdigit()]
def dump(path,v):
    path.parent.mkdir(parents=True,exist_ok=True)
    with gzip.open(path,"wt",encoding="utf8",compresslevel=6) as f:json.dump(v,f,ensure_ascii=False,separators=(",",":"))
manifest={"schema":1,"attribution":"Tipitaka.lk / Pitaka.lk; SuttaCentral Bilara","source_revisions":dict(db.execute("select key,value from metadata")),"languages":{}}
for lang in ["si","pli-si","en","pli"]:
    # Group by upstream document. IDs of grouped Bilara files remain intact.
    docs=[]; terms=collections.defaultdict(list); total=0
    cur=db.execute("SELECT p.source_id,p.original,s.title,s.pali_title FROM passage p JOIN source s ON p.source_id=s.id WHERE p.lang=? ORDER BY p.source_id,p.id",(lang,))
    last=None; counts=collections.Counter(); title=""
    def finish():
        global total
        if not last or not counts:return
        i=len(docs);length=sum(counts.values());docs.append([last,length]);total+=length
        for word,tf in counts.items():
            h=hashlib.sha256(word.encode()).hexdigest()[:20]
            terms[h].append([i,tf])
    for sid,original,st,pt in cur:
        if sid!=last:
            finish();last=sid;counts=collections.Counter(tokens(pt if lang.startswith("pli") else st)*3);title=st
        counts.update(tokens(original))
    finish()
    buckets=collections.defaultdict(dict)
    for h,post in terms.items():
        df=len(post)
        # retain the highest frequency/length postings for very common terms
        if df>1600:post=sorted(post,key=lambda x:x[1]/(docs[x[0]][1]+300),reverse=True)[:1600]
        buckets[h[:2]][h]=[df,post]
    dump(out/lang/"docs.json.gz",docs)
    for k,data in buckets.items():dump(out/lang/(k+".json.gz"),data)
    manifest["languages"][lang]={"documents":len(docs),"terms":len(terms),"avgdl":total/max(len(docs),1),"buckets":sorted(buckets)}
    print(lang,manifest["languages"][lang]["documents"],len(terms),flush=True)
    del terms,buckets,docs
(out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
print("Index bytes",sum(f.stat().st_size for f in out.rglob("*") if f.is_file()))
assert manifest["languages"]["si"]["documents"]>1000
