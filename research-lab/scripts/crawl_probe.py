"""One-page smoke test only, respects robots.txt and never bypasses restrictions."""
import asyncio, urllib.robotparser, urllib.request
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
URL="https://tipitaka.lk/sn-2-3-1-6/sinh"
async def main():
    rp=urllib.robotparser.RobotFileParser("https://tipitaka.lk/robots.txt")
    try:
        rp.read()
    except Exception as e:
        print("Robots policy unavailable; skip",type(e).__name__);return
    if not rp.can_fetch("SuttaGoResearchLab",URL):
        print("Robots policy excludes this URL; skip");return
    async with AsyncWebCrawler(config=BrowserConfig(headless=True,user_agent="SuttaGoResearchLab")) as crawler:
        result=await crawler.arun(URL,config=CrawlerRunConfig(page_timeout=30000))
        assert result.success, result.error_message
        md=str(result.markdown)
        print("Crawl4AI response chars:",len(md),"Sinhala:",any("\u0d80"<=c<="\u0dff" for c in md))
if __name__=="__main__":asyncio.run(main())
