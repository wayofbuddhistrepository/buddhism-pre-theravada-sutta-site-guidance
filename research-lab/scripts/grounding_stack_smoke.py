"""Bounded public-source checks; do not bypass robots.txt or source restrictions."""
import json, urllib.request, urllib.robotparser, urllib.parse
import trafilatura
from scrapy.http import HtmlResponse
url="https://www.dhammatalks.org/suttas/SN/SN12_61.html"
agent="SuttaGoResearchLab"
rp=urllib.robotparser.RobotFileParser("https://www.dhammatalks.org/robots.txt")
try:
    rp.read()
except Exception:
    raise SystemExit("Robots policy unavailable; no crawl attempted")
if not rp.can_fetch(agent,url):
    raise SystemExit("Robots policy excludes URL; no crawl attempted")
with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":agent}),timeout=20) as r:
    raw=r.read(1000000)
page=HtmlResponse(url=url,body=raw,encoding="utf-8")
main=" ".join(page.css("main p ::text, main p::text").getall())
clean=trafilatura.extract(raw,include_comments=False,include_tables=False)
assert clean and "monkey" in clean.lower()
assert main and "monkey" in main.lower()
print("Scrapy parser and Trafilatura source extraction passed",len(main),len(clean))
