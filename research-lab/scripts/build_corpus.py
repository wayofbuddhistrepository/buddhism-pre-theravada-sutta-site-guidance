"""Offline canonical corpus index. Original source text is preserved verbatim.
Source attribution: Tipitaka.lk / Pitaka.lk (CC BY-ND 4.0); SuttaCentral Bilara.
Search normalization is separate from preserved passages. No source text is changed.
"""
import argparse, bisect, collections, json, pathlib, sqlite3, unicodedata, re, subprocess
p=argparse.ArgumentParser()
p.add_argument("--bjt",type=pathlib.Path,required=True)
p.add_argument("--bilara",type=pathlib.Path,required=True)
p.add_argument("--output",type=pathlib.Path,required=True)
a=p.parse_args()
a.output.parent.mkdir(parents=True,exist_ok=True)
db=sqlite3.connect(a.output)
db.executescript("""
CREATE TABLE IF NOT EXISTS source(id TEXT PRIMARY KEY, title TEXT, pali_title TEXT, parent TEXT, collection TEXT, url TEXT);
CREATE TABLE IF NOT EXISTS edge(src TEXT,dst TEXT,kind TEXT,PRIMARY KEY(src,dst,kind));
CREATE TABLE IF NOT EXISTS passage(id INTEGER PRIMARY KEY,source_id TEXT,lang TEXT,locator TEXT,original TEXT);
CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(title,body,source_id UNINDEXED,lang UNINDEXED,tokenize="unicode61 remove_diacritics 0 categories 'L* N* M* Co'");
CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT);
""")
def norm(s):
    return unicodedata.normalize("NFC",s).replace("\u200d","").replace("\u200c","").casefold()
def source(id,title,pali,parent,collection,url):
    db.execute("INSERT OR REPLACE INTO source VALUES(?,?,?,?,?,?)",(id,title,pali,parent,collection,url))
    if parent: db.execute("INSERT OR IGNORE INTO edge VALUES(?,?,?)",(id,parent,"is_part_of"))
def passage(id,lang,locator,text,title):
    if not isinstance(text,str) or not text.strip(): return
    cur=db.execute("INSERT INTO passage(source_id,lang,locator,original) VALUES(?,?,?,?)",(id,lang,locator,text))
    db.execute("INSERT INTO search(rowid,title,body,source_id,lang) VALUES(?,?,?,?,?)",(cur.lastrowid,norm(title),norm(text),id,lang))
def revision(root):
    return subprocess.check_output(["git","-C",str(root),"rev-parse","HEAD"],text=True).strip()
tree=json.loads((a.bjt/"public/static/data/tree.json").read_text())
children=collections.Counter(x[4] for x in tree.values() if len(x)>=6)
canonical=re.compile(r"^(?:dn|mn|sn|an|kn|vp|ap)(?:-|$)")
group=collections.defaultdict(list)
for key,row in tree.items():
    if len(row)<6 or not canonical.match(key): continue
    pali,title,level,position,parent,file=row[:6]
    source("bjt:"+key,title,pali,"bjt:"+parent if parent in tree else None,"canonical","https://tipitaka.lk/"+key+"/sinh")
    if not children[key] and isinstance(position,list) and len(position)==2 and isinstance(file,str):
        group[file].append((tuple(position),key,title,pali))
for file,nodes in sorted(group.items()):
    f=a.bjt/"public/static/text"/(file+".json")
    if not f.is_file():continue
    pages=json.loads(f.read_text()).get("pages",[])
    nodes.sort(); starts=[x[0] for x in nodes]
    for pi,page in enumerate(pages):
        for lang,field in [("si","sinh"),("pli-si","pali")]:
            for ei,e in enumerate(page.get(field,{}).get("entries",[])):
                i=bisect.bisect_right(starts,(pi,ei))-1
                if i<0:continue
                # Source positions are verified against the upstream tree; do not infer a cross-edition identifier.
                _,key,title,pali=nodes[i]
                passage("bjt:"+key,lang,f"{file}:{page.get('pageNum',pi)}:{ei}",e.get("text"),title if lang=="si" else pali)
    db.commit()
# English and Roman-script Pali: stable Bilara segment identifiers retained.
for directory,pattern,lang in [
    ("translation/en/sujato/sutta","*_translation-en-sujato.json","en"),
    ("root/pli/ms/sutta","*_root-pli-ms.json","pli")]:
    for f in sorted((a.bilara/directory).rglob(pattern)):
        d=json.loads(f.read_text())
        if not isinstance(d,dict) or not d:continue
        uid=f.name.split("_",1)[0]
        sid="sc:"+uid
        title=next((v for k,v in d.items() if k.endswith(":0.3")),uid)
        prev=db.execute("SELECT title,pali_title FROM source WHERE id=?",(sid,)).fetchone()
        source(sid,title if lang=="en" else (prev[0] if prev else uid),title if lang=="pli" else (prev[1] if prev else ""),None,"canonical","https://suttacentral.net/"+uid)
        for k,v in d.items():passage(sid,lang,k,v,title)
    db.commit()
# Reviewed cross-edition mappings and concepts; no fabricated LLM graph edges.
for b,s in [("sn-2-1-7-1","sn12.61"),("an-1-5-9","an1.49"),("mn-1-1-10","mn10"),("mn-1-2-10","mn20"),("sn-2-3-1-6","sn15.6"),("sn-5-12-2-1","sn56.11")]:
    db.execute("INSERT OR IGNORE INTO edge VALUES(?,?,?)",("bjt:"+b,"sc:"+s,"reviewed_parallel"))
for s in ["sn12.61","an1.49","mn10","mn20"]:
    db.execute("INSERT OR IGNORE INTO edge VALUES(?,?,?)",("concept:citta","sc:"+s,"reviewed_topic"))
for k,v in [("bjt_revision",revision(a.bjt)),("bilara_revision",revision(a.bilara)),("license","Tipitaka.lk/Pitaka.lk CC BY-ND 4.0; Bilara source license; attribution required")]:
    db.execute("INSERT OR REPLACE INTO metadata VALUES(?,?)",(k,v))
db.commit()
print("Passages by language:",db.execute("SELECT lang,count(*) FROM passage GROUP BY lang").fetchall())
print("Source nodes:",db.execute("SELECT count(*) FROM source").fetchone()[0])
print("Graph edges:",db.execute("SELECT count(*) FROM edge").fetchone()[0])
assert db.execute("SELECT count(*) FROM passage WHERE lang='si'").fetchone()[0]>10000
assert db.execute("SELECT count(*) FROM passage WHERE lang='en'").fetchone()[0]>10000
print("Indexed example:",db.execute("SELECT source_id,lang FROM search WHERE search MATCH ? AND lang='si' LIMIT 5",('"සිත"',)).fetchall())
db.close()
